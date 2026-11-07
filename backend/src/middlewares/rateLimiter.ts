import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from '../config/redis';

interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
  identityFn?: (req: Request) => string;
}

/**
 * Derives a privacy-safe request fingerprint for rate limiting.
 * Uses a one-way hash of available connection metadata without storing raw IPs.
 * Falls back to 'anon' if no identifying data is available.
 */
function deriveRequestFingerprint(req: Request): string {
  // Build a fingerprint from available, privacy-acceptable metadata
  const parts: string[] = [];

  // User-Agent provides device/browser differentiation
  const ua = req.headers['user-agent'] ?? '';
  if (ua) parts.push(ua);

  // Accept-Language provides locale differentiation
  const lang = req.headers['accept-language'] ?? '';
  if (lang) parts.push(lang);

  // The underlying socket address (already scrubbed to 0.0.0.0 by privacyShield,
  // but we still use it as a fingerprint component since reverse proxies may
  // override the socket before our middleware in some deployments)
  const addr = req.socket?.remoteAddress ?? '';
  if (addr && addr !== '0.0.0.0') parts.push(addr);

  if (parts.length === 0) return 'anon';

  // One-way hash to avoid storing raw headers
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

/**
 * Redis-backed sliding-window rate limiter.
 * Uses a privacy-safe identity: userId (if authenticated) or a derived
 * request fingerprint — never a raw IP address.
 */
export function createRateLimiter(opts: RateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const identity = opts.identityFn
      ? opts.identityFn(req)
      : (req.userId ?? deriveRequestFingerprint(req));

    const key = `rl:${opts.keyPrefix}:${identity}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', opts.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - count));

      if (count > opts.maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl);
        res.status(429).json({
          error: 'Too many requests',
          retryAfterSeconds: ttl,
        });
        return;
      }
    } catch (err) {
      // Redis failure → fail open (don't block legitimate traffic)
      console.error('[RateLimiter] Redis error, failing open:', err);
    }

    next();
  };
}

// Pre-configured limiters
export const aiRateLimiter = createRateLimiter({
  windowSeconds: 3600,  // 1 hour
  maxRequests: 20,
  keyPrefix: 'ai',
});

export const authRateLimiter = createRateLimiter({
  windowSeconds: 900,   // 15 minutes
  maxRequests: 15,      // Per-fingerprint, not global
  keyPrefix: 'auth',
  identityFn: (req) => deriveRequestFingerprint(req),
});

export const recoveryRateLimiter = createRateLimiter({
  windowSeconds: 3600,  // 1 hour
  maxRequests: 5,       // Strict limit on recovery attempts
  keyPrefix: 'recovery',
  identityFn: (req) => deriveRequestFingerprint(req),
});
