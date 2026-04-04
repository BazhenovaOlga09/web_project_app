import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.subject, m.text, m.is_read, m.created_at,
              u.name AS sender_name, u.initials AS sender_initials, u.color AS sender_color
       FROM mail m
       JOIN users u ON u.id = m.sender_id
       WHERE m.receiver_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/sent', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.subject, m.text, m.is_read, m.created_at,
              u.name AS receiver_name, u.initials AS receiver_initials, u.color AS receiver_color
       FROM mail m
       JOIN users u ON u.id = m.receiver_id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/send', requireAuth, async (req, res) => {
  const { receiver_id, subject, text } = req.body;
  if (!receiver_id || !subject?.trim() || !text?.trim())
    return res.status(400).json({ error: 'Заполните все поля' });
  if (receiver_id === req.user.id)
    return res.status(400).json({ error: 'Нельзя написать самому себе' });

  try {
    const check = await pool.query('SELECT id FROM users WHERE id=$1', [receiver_id]);
    if (!check.rows.length)
      return res.status(404).json({ error: 'Получатель не найден' });

    const { rows } = await pool.query(
      `INSERT INTO mail (sender_id, receiver_id, subject, text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, receiver_id, subject.trim(), text.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE mail SET is_read=TRUE WHERE id=$1 AND receiver_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;