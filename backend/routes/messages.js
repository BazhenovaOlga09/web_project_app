import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/users', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  try {
    const { rows } = await pool.query(
      `SELECT id, name, initials, color, role, class_label, subject
       FROM users
       WHERE id != $1
         AND ($2 = '' OR
              LOWER(name) LIKE '%' || $2 || '%' OR
              LOWER(COALESCE(class_label,'')) LIKE '%' || $2 || '%' OR
              LOWER(COALESCE(subject,'')) LIKE '%' || $2 || '%'
         )
       ORDER BY name`,
      [req.user.id, q]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const { rows: dialogRows } = await pool.query(
      `SELECT DISTINCT ON (partner_id)
          partner_id,
          partner_name,
          partner_initials,
          partner_color,
          last_text,
          last_time,
          unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
           CASE WHEN m.sender_id = $1 THEN ru.name     ELSE su.name     END AS partner_name,
           CASE WHEN m.sender_id = $1 THEN ru.initials ELSE su.initials END AS partner_initials,
           CASE WHEN m.sender_id = $1 THEN ru.color    ELSE su.color    END AS partner_color,
           m.text AS last_text,
           m.created_at AS last_time,
           (SELECT COUNT(*)::int FROM messages unr
            WHERE unr.sender_id != $1
              AND unr.receiver_id = $1
              AND unr.is_read = FALSE
              AND unr.sender_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
           ) AS unread_count,
           m.sender_id
         FROM messages m
         JOIN users su ON su.id = m.sender_id
         JOIN users ru ON ru.id = m.receiver_id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY partner_id, last_time DESC`,
      [req.user.id]
    );

    const { rows: allUsers } = await pool.query(
      `SELECT id, name, initials, color FROM users WHERE id != $1 ORDER BY name`,
      [req.user.id]
    );

    const dialogIds = new Set(dialogRows.map(r => Number(r.partner_id)));
    const newUsers = allUsers
      .filter(u => !dialogIds.has(Number(u.id)))
      .map(u => ({
        partner_id:       u.id,
        partner_name:     u.name,
        partner_initials: u.initials,
        partner_color:    u.color,
        last_text:        null,
        last_time:        null,
        unread_count:     0,
      }));

    res.json([...dialogRows, ...newUsers]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:userId', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = parseInt(req.query.offset) || 0;

  if (isNaN(userId)) return res.status(400).json({ error: 'Некорректный ID' });

  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.text, m.created_at, m.is_read,
              (m.sender_id = $1) AS "out"
       FROM messages m
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [req.user.id, userId, limit, offset]
    );

    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [userId, req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:userId', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { text } = req.body;

  if (isNaN(userId)) return res.status(400).json({ error: 'Некорректный ID' });
  if (!text || !text.trim()) return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  if (userId === req.user.id) return res.status(400).json({ error: 'Нельзя написать самому себе' });

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE id=$1', [userId]);
    if (!userCheck.rows.length)
      return res.status(404).json({ error: 'Пользователь не найден' });

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, text)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, userId, text.trim()]
    );
    res.status(201).json({ ...rows[0], out: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;