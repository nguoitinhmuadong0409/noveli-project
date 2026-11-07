import Redis from 'ioredis';
import { ENV } from './env';

export const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// ─── Helpers ────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; }
  catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const count = await redis.incr(key);
  if (ttlSeconds && count === 1) await redis.expire(key, ttlSeconds);
  return count;
}
