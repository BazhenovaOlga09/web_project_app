import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function formatRelativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} ч. назад`;
  return `${Math.floor(diff / 86400)} д. назад`;
}

router.get('/', requireAuth, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;
  const groupId = req.query.group_id || null;

  try {
    const params = [req.user.id, limit, offset];
    const groupFilter = groupId ? 'AND p.group_id = $4' : '';
    if (groupId) params.push(groupId);

    const { rows } = await pool.query(
      `SELECT
          p.id,
          p.text,
          p.created_at,
          p.likes_count,
          u.name   AS author,
          u.initials,
          u.color,
          g.name   AS "group",
          g.icon   AS "groupIcon",
          g.id     AS "groupId",
          EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS liked,
          (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN groups g ON g.id = p.group_id
       WHERE TRUE ${groupFilter}
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const countParams = groupId ? [groupId] : [];
    const countFilter = groupId ? 'WHERE group_id = $1' : '';
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM posts ${countFilter}`,
      countParams
    );
    const total = countRes.rows[0].total;

    const posts = rows.map((p) => ({
      ...p,
      colorText: '#fff',
      time: formatRelativeTime(p.created_at),
    }));

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[posts/list]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const postRes = await pool.query(
      `SELECT p.*, u.name AS author, u.initials, u.color,
              g.name AS "group", g.icon AS "groupIcon",
              EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS liked
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN groups g ON g.id = p.group_id
       WHERE p.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!postRes.rows.length) return res.status(404).json({ error: 'Пост не найден' });

    const commentsRes = await pool.query(
      `SELECT c.id, c.text, c.created_at,
              u.name AS author, u.initials, u.color
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    const post = postRes.rows[0];
    res.json({
      ...post,
      colorText: '#fff',
      time: formatRelativeTime(post.created_at),
      comments: commentsRes.rows,
    });
  } catch (err) {
    console.error('[posts/get]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { text, group_id } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: 'Напишите что-нибудь' });

  try {

    if (group_id) {
      const member = await pool.query(
        'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
        [group_id, req.user.id]
      );
      if (!member.rows.length)
        return res.status(403).json({ error: 'Вы не состоите в этой группе' });
    }

    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, group_id, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, group_id || null, text.trim()]
    );
    const post = rows[0];

    const fullRes = await pool.query(
      `SELECT p.*, u.name AS author, u.initials, u.color,
              g.name AS "group", g.icon AS "groupIcon"
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN groups g ON g.id = p.group_id
       WHERE p.id = $1`,
      [post.id]
    );

    res.status(201).json({
      ...fullRes.rows[0],
      colorText: '#fff',
      time: 'только что',
      liked: false,
      comments: [],
      comments_count: 0,
    });
  } catch (err) {
    console.error('[posts/create]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: 'Текст не может быть пустым' });

  try {
    const check = await pool.query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Не найдено' });
    if (check.rows[0].author_id !== req.user.id)
      return res.status(403).json({ error: 'Нет прав' });

    const { rows } = await pool.query(
      'UPDATE posts SET text = $1 WHERE id = $2 RETURNING *',
      [text.trim(), req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[posts/update]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const check = await pool.query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Не найдено' });
    if (check.rows[0].author_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Нет прав' });

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[posts/delete]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query(
      'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    let liked;
    if (exists.rows.length) {
      await client.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      await client.query(
        'UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1',
        [req.params.id]
      );
      liked = false;
    } else {
      await client.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [req.params.id, req.user.id]
      );
      await client.query(
        'UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1',
        [req.params.id]
      );
      liked = true;
    }

    const postRes = await client.query(
      'SELECT likes_count FROM posts WHERE id = $1', [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ liked, likes: postRes.rows[0]?.likes_count ?? 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[posts/like]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.text, c.created_at,
              u.name AS author, u.initials, u.color
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[posts/comments]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: 'Комментарий не может быть пустым' });

  try {

    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [req.params.id]);
    if (!postCheck.rows.length) return res.status(404).json({ error: 'Пост не найден' });

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, author_id, text) VALUES ($1, $2, $3)
       RETURNING id, text, created_at`,
      [req.params.id, req.user.id, text.trim()]
    );

    res.status(201).json({
      ...rows[0],
      author: req.user.name,
      initials: req.user.initials,
      color: req.user.color,
    });
  } catch (err) {
    console.error('[posts/addcomment]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;