import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

// ─── Access Token ────────────────────────────────────────────

export function signAccessToken(userId: string): string {
  // expiresIn as seconds (number) to satisfy jsonwebtoken v9 strict overloads
  const fifteenMinutes = 15 * 60;
  return jwt.sign({ sub: userId }, ENV.JWT_ACCESS_SECRET, {
    expiresIn: fifteenMinutes,
    algorithm: 'HS256',
  });
}

// ─── Refresh Token ───────────────────────────────────────────

export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── Recovery Key ────────────────────────────────────────────
// Format: BKHL-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX (160-bit = 20 random bytes)

export function generateRecoveryKey(): string {
  const bytes = crypto.randomBytes(20);
  const hex = bytes.toString('hex').toUpperCase();
  // Split into 5 groups of 8 hex chars
  return `BKHL-${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}-${hex.slice(32, 40)}`;
}

export function hashRecoveryKey(key: string): string {
  // Use SHA-256 for storage (fast lookup); bcrypt used at registration for extra hardening
  return crypto.createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
}

// ─── Refresh Token Cookie ────────────────────────────────────

export function refreshCookieOptions() {
  const expires = new Date();
  expires.setDate(expires.getDate() + ENV.REFRESH_TOKEN_TTL_DAYS);
  return {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    expires,
  };
}
