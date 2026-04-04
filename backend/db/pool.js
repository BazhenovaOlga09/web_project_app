import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'lycea',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max:      10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  client_encoding: 'UTF8',
});

pool.on('error', (err) => {
  console.error('[DB] pool error:', err);
});

export default pool;