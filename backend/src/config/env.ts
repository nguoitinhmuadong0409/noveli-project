import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ownerBiDanh = process.env.OWNER_BIDAN?.trim() || null;
const ownerSetupKey = process.env.OWNER_SETUP_KEY || null;
if (process.env.NODE_ENV === 'production' && !ownerBiDanh) {
  throw new Error('Missing required environment variable: OWNER_BIDAN');
}
if (ownerSetupKey && ownerSetupKey.length < 32) {
  throw new Error('OWNER_SETUP_KEY must contain at least 32 characters');
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  FORUM_ANONYMOUS_SECRET: requireEnv('FORUM_ANONYMOUS_SECRET'),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  OWNER_BIDAN: ownerBiDanh,
  OWNER_SETUP_KEY: ownerSetupKey,
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 90,
};
