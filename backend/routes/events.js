import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              g.name AS "groupName", g.icon AS "groupIcon",
              EXISTS(
                SELECT 1 FROM event_attendees ea
                WHERE ea.event_id = e.id AND ea.user_id = $1
              ) AS going
       FROM events e
       LEFT JOIN groups g ON g.id = e.group_id
       ORDER BY e.event_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[events/list]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { title, description = '', event_date, location = '', group_id, color = 'purple' } = req.body;
  if (!title || !event_date)
    return res.status(400).json({ error: 'Введите название и дату' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, event_date, location, group_id, color, creator_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title.trim(), description.trim(), event_date, location.trim(), group_id || null, color, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[events/create]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/attend', requireAuth, async (req, res) => {
  try {
    const exists = await pool.query(
      'SELECT 1 FROM event_attendees WHERE event_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    let going;
    if (exists.rows.length) {
      await pool.query('DELETE FROM event_attendees WHERE event_id=$1 AND user_id=$2',
        [req.params.id, req.user.id]);
      going = false;
    } else {
      await pool.query('INSERT INTO event_attendees (event_id,user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
      going = true;
    }
    res.json({ going });
  } catch (err) {
    console.error('[events/attend]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const check = await pool.query('SELECT creator_id FROM events WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Не найдено' });
    if (req.user.role !== 'teacher' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Нет прав' });
    await pool.query('DELETE FROM events WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[events/delete]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;