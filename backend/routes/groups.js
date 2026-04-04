import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS members_count,
              EXISTS(
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = g.id AND gm.user_id = $1
              ) AS joined
       FROM groups g
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[groups/list]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS members_count,
              EXISTS(
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = g.id AND gm.user_id = $2
              ) AS joined
       FROM groups g
       WHERE g.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Сообщество не найдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[groups/get]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description = '', icon = '💡', color } = req.body;

  if (!name || !name.trim())
    return res.status(400).json({ error: 'Введите название группы' });

  const COLORS = [
    'rgba(124,110,247,0.15)',
    'rgba(247,168,110,0.15)',
    'rgba(86,217,156,0.15)',
    'rgba(110,200,247,0.15)',
    'rgba(232,124,247,0.15)',
    'rgba(247,110,142,0.15)',
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const countRes = await client.query('SELECT COUNT(*)::int AS cnt FROM groups');
    const autoColor = COLORS[countRes.rows[0].cnt % COLORS.length];

    const { rows } = await client.query(
      `INSERT INTO groups (name, description, icon, color, creator_id, members_count)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING *`,
      [name.trim(), description.trim(), icon.trim() || '💡', color || autoColor, req.user.id]
    );
    const group = rows[0];

    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...group, members_count: 1, joined: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[groups/create]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { name, description, icon, color } = req.body;
  try {

    const check = await pool.query(
      'SELECT creator_id FROM groups WHERE id = $1', [req.params.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Не найдено' });
    if (check.rows[0].creator_id !== req.user.id)
      return res.status(403).json({ error: 'Нет прав' });

    const { rows } = await pool.query(
      `UPDATE groups
       SET name        = COALESCE($1, name),
           description = COALESCE($2, description),
           icon        = COALESCE($3, icon),
           color       = COALESCE($4, color)
       WHERE id = $5
       RETURNING *`,
      [name, description, icon, color, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[groups/update]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT creator_id FROM groups WHERE id = $1', [req.params.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Не найдено' });
    if (check.rows[0].creator_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Нет прав' });

    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[groups/delete]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/join', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupRes = await client.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (!groupRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    const already = await client.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    let joined;
    if (already.rows.length) {

      await client.query(
        'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      await client.query(
        'UPDATE groups SET members_count = GREATEST(0, members_count - 1) WHERE id = $1',
        [req.params.id]
      );
      joined = false;
    } else {

      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [req.params.id, req.user.id]
      );
      await client.query(
        'UPDATE groups SET members_count = members_count + 1 WHERE id = $1',
        [req.params.id]
      );
      joined = true;
    }

    const updatedGroup = await client.query(
      'SELECT * FROM groups WHERE id = $1', [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ joined, members_count: updatedGroup.rows[0].members_count });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[groups/join]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

export default router;