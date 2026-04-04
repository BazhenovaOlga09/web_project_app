import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lycea_super_secret_change_in_prod';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role, email: user.email, initials: user.initials, color: user.color },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export const JWT_SECRET_EXPORT = JWT_SECRET;