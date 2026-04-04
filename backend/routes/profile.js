import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, initials, color, class_label, subject, bio
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, role, initials, color, class_label, subject, bio
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, bio, class_label, subject } = req.body;

  if (name !== undefined && !name.trim())
    return res.status(400).json({ error: 'Имя не может быть пустым' });

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET name        = COALESCE($1, name),
           bio         = COALESCE($2, bio),
           class_label = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE class_label END,
           subject     = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE subject END
       WHERE id = $5
       RETURNING id, name, role, initials, color, class_label, subject, bio`,
      [
        name?.trim() || null,
        bio !== undefined ? bio.trim() : null,
        class_label !== undefined ? class_label.trim() : null,
        subject !== undefined ? subject.trim() : null,
        req.user.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;