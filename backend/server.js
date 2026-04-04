import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes     from './routes/auth.js';
import groupsRoutes   from './routes/groups.js';
import postsRoutes    from './routes/posts.js';
import eventsRoutes   from './routes/events.js';
import messagesRoutes from './routes/messages.js';
import mailRoutes     from './routes/mail.js';
import profileRoutes  from './routes/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth',     authRoutes);
app.use('/api/groups',   groupsRoutes);
app.use('/api/posts',    postsRoutes);
app.use('/api/events',   eventsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/mail',     mailRoutes);
app.use('/api/profile',  profileRoutes);

const frontendDir = path.join(__dirname, '..', 'lycea-simple');
app.use(express.static(frontendDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});