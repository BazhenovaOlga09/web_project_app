import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import {
  signAccessToken,
  signRefreshToken,
  JWT_SECRET_EXPORT as JWT_SECRET,
} from '../middleware/auth.js';

const router = Router();

const AVATAR_PALETTE = ['#7c6ef7', '#f7a86e', '#56d99c', '#6ec8f7', '#e87cf7', '#f76e8e'];

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

async function getColorForNewUser() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
  return AVATAR_PALETTE[rows[0].cnt % AVATAR_PALETTE.length];
}

router.post('/register', async (req, res) => {
  const { name, email, password, role = 'student', class_label, subject } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  if (!email.includes('@'))
    return res.status(400).json({ error: 'Введите корректный email' });
  if (!['student', 'teacher'].includes(role))
    return res.status(400).json({ error: 'Некорректная роль' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'Этот email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const initials = getInitials(name);
    const color = await getColorForNewUser();

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, initials, color, class_label, subject)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, initials, color, class_label, subject`,
      [name.trim(), email.toLowerCase(), hash, role, initials, color,
       role === 'student' ? (class_label || null) : null,
       role === 'teacher' ? (subject || null) : null]
    );
    const user = rows[0];

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Неверный email или пароль' });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: 'Нет refresh-токена' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Токен недействителен' });

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    const newAccess  = signAccessToken(user);
    const newRefresh = signRefreshToken(user);
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefresh, expiresAt]
    );

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]).catch(() => {});
  }
  res.json({ ok: true });
});

export default router;