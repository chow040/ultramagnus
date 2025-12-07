import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Allow self-signed certs for Supabase pooler in dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

// Prevent unhandled pool errors from crashing the server and surface them to logs
pool.on('error', (err) => {
  logger.error({ message: 'db.pool.error', err });
});

export const db = drizzle(pool);
