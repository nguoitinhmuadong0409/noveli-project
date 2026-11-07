import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateRecoveryKey,
  hashRecoveryKey,
  refreshCookieOptions,
} from '../../utils/tokens';
import {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  rotateRecoveryKeySchema,
} from '../../utils/validation';
import { ENV } from '../../config/env';
import { isOwnerBiDanh, isValidOwnerSetupKey } from '../../utils/owner';

const BCRYPT_ROUNDS = 12;
const COOKIE_NAME = 'bkhl_rt';

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  // 1. Validate input
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { biDanh, password, deviceType, ownerSetupKey } = parsed.data;
  const isOwnerAccount = isOwnerBiDanh(biDanh);

  if (isOwnerAccount && !isValidOwnerSetupKey(ownerSetupKey)) {
    res.status(403).json({ error: 'A valid owner setup key is required for this account' });
    return;
  }

  if (!isOwnerAccount && ownerSetupKey) {
    res.status(400).json({ error: 'Owner setup key is only valid for the configured owner account' });
    return;
  }

  // 2. Check biDanh uniqueness (case-insensitive collision prevention)
  const existingUser = await prisma.user.findFirst({
    where: { biDanh: { equals: biDanh, mode: 'insensitive' } },
    select: { id: true },
  });

  if (existingUser) {
    res.status(409).json({ error: 'biDanh already taken. Please choose another.' });
    return;
  }

  // 3. Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 4. Generate Recovery Key — shown ONCE, never stored in plain text
  const recoveryKey = generateRecoveryKey();
  // Use SHA-256 for fast lookup; bcrypt adds hardening at storage
  const recoveryKeyHashSha = hashRecoveryKey(recoveryKey);
  const recoveryKeyHash = await bcrypt.hash(recoveryKeyHashSha, BCRYPT_ROUNDS);

  // 5. Generate avatar seed (deterministic but random-looking)
  const avatarSeed = crypto.randomBytes(16).toString('hex');

  // 6. Create user in DB
  let user: { id: string; biDanh: string; avatarSeed: string; role: string; createdAt: Date };
  try {
    user = await prisma.user.create({
      data: {
        biDanh,
        passwordHash,
        recoveryKeyHash,
        avatarSeed,
        ...(isOwnerAccount ? { role: 'admin' } : {}),
      },
      select: { id: true, biDanh: true, avatarSeed: true, role: true, createdAt: true },
    });
  } catch (err: unknown) {
    // Handle race condition where two registrations with same biDanh hit simultaneously
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'biDanh already taken.' });
      return;
    }
    console.error('[Auth] Register DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  // 7. Issue Access Token + Refresh Token
  const accessToken = signAccessToken(user.id);
  const { raw: refreshTokenRaw, hash: refreshTokenHash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ENV.REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceType: deviceType ?? 'web',
      expiresAt,
    },
  });

  // 8. Set HttpOnly Secure SameSite=Strict cookie
  res.cookie(COOKIE_NAME, refreshTokenRaw, refreshCookieOptions());

  // 9. Return — include recoveryKey in response body (ONLY this one time)
  res.status(201).json({
    message: 'Account created successfully',
    user: {
      id: user.id,
      biDanh: user.biDanh,
      avatarSeed: user.avatarSeed,
      role: user.role,
      createdAt: user.createdAt,
    },
    accessToken,
    // CRITICAL: This is the ONLY time the Recovery Key is returned.
    // The user MUST save it. We cannot recover it for them.
    recoveryKey,
    recoveryKeyWarning:
      'Save this Recovery Key immediately. It will never be shown again. It is the only way to recover your account if you forget your password.',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'biDanh and password are required' });
    return;
  }

  const { biDanh, password, deviceType } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { biDanh: { equals: biDanh, mode: 'insensitive' } },
    select: {
      id: true,
      biDanh: true,
      passwordHash: true,
      avatarSeed: true,
      currentStreak: true,
      role: true,
    },
  });

  // Use constant-time comparison to prevent timing attacks
  const dummyHash = '$2a$12$dummyhashtopreventtimingattacksonnonexistentusers12345';
  const hashToCheck = user?.passwordHash ?? dummyHash;
  const passwordMatches = await bcrypt.compare(password, hashToCheck);

  if (!user || !passwordMatches) {
    res.status(401).json({ error: 'Invalid biDanh or password' });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const { raw: refreshTokenRaw, hash: refreshTokenHash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ENV.REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceType,
      expiresAt,
    },
  });

  res.cookie(COOKIE_NAME, refreshTokenRaw, refreshCookieOptions());

  res.status(200).json({
    user: {
      id: user.id,
      biDanh: user.biDanh,
      avatarSeed: user.avatarSeed,
      currentStreak: user.currentStreak,
      role: user.role,
    },
    accessToken,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshTokens(req: Request, res: Response): Promise<void> {
  const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  const tokenHash = hashRefreshToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, biDanh: true, avatarSeed: true, currentStreak: true, role: true } },
    },
  });

  if (!stored || stored.expiresAt < new Date()) {
    // If stored token exists but is expired, clean it up
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    }
    res.clearCookie(COOKIE_NAME, refreshCookieOptions());
    res.status(401).json({ error: 'Refresh token invalid or expired' });
    return;
  }

  // Rotate refresh token (token rotation strategy)
  const { raw: newRaw, hash: newHash } = generateRefreshToken();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + ENV.REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { tokenHash: newHash, expiresAt: newExpiresAt },
  });

  res.cookie(COOKIE_NAME, newRaw, refreshCookieOptions());

  res.json({
    accessToken: signAccessToken(stored.user.id),
    user: {
      id: stored.user.id,
      biDanh: stored.user.biDanh,
      avatarSeed: stored.user.avatarSeed,
      currentStreak: stored.user.currentStreak,
      role: stored.user.role,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];

  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } }).catch(() => {});
  }

  res.clearCookie(COOKIE_NAME, refreshCookieOptions());
  res.status(200).json({ message: 'Logged out successfully' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/logout-all
// ─────────────────────────────────────────────────────────────────────────────

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  await prisma.refreshToken.deleteMany({ where: { userId } });

  res.clearCookie(COOKIE_NAME, refreshCookieOptions());
  res.status(200).json({ message: 'All sessions revoked successfully' });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/auth/me
// ─────────────────────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      biDanh: true,
      role: true,
      avatarSeed: true,
      preferences: true,
      currentStreak: true,
      longestStreak: true,
      lastReadDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          shelves: true,
          reviews: true,
          readingLogs: true,
          goals: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /api/v1/auth/me
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { avatarSeed, preferences } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (avatarSeed !== undefined) updateData.avatarSeed = avatarSeed;
  if (preferences !== undefined) updateData.preferences = preferences;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      biDanh: true,
      role: true,
      avatarSeed: true,
      preferences: true,
      currentStreak: true,
      longestStreak: true,
      lastReadDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ user });
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /api/v1/auth/password
// ─────────────────────────────────────────────────────────────────────────────

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  // 1. Fetch the current password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // 2. Verify current password
  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  // 3. Hash new password and update, revoking all other sessions
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Keep the current session's refresh token, revoke all others
  const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
  const currentTokenHash = rawToken ? hashRefreshToken(rawToken) : null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    // Delete all refresh tokens EXCEPT the current one
    prisma.refreshToken.deleteMany({
      where: {
        userId,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
    }),
  ]);

  res.status(200).json({
    message: 'Password changed successfully. Other sessions have been revoked.',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/auth/recover-password
// ─────────────────────────────────────────────────────────────────────────────

export async function recoverPassword(req: Request, res: Response): Promise<void> {
  // 1. Validate input
  const parsed = recoverPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { biDanh, recoveryKey, newPassword } = parsed.data;

  // 2. Find user by biDanh
  const user = await prisma.user.findFirst({
    where: { biDanh: { equals: biDanh, mode: 'insensitive' } },
    select: { id: true, recoveryKeyHash: true },
  });

  // 3. Timing-safe recovery key verification
  // We stored bcrypt(sha256(rawKey)), so we must re-derive sha256 first
  const inputKeyHashSha = hashRecoveryKey(recoveryKey);

  // Always run bcrypt compare to prevent timing attacks on non-existent users
  const dummyHash = '$2a$12$dummyhashtopreventtimingattacksonrecoverykey123456789';
  const hashToCompare = user?.recoveryKeyHash ?? dummyHash;
  const keyMatches = await bcrypt.compare(inputKeyHashSha, hashToCompare);

  if (!user || !keyMatches) {
    // Intentionally vague error — do not reveal whether biDanh exists
    res.status(401).json({ error: 'Invalid biDanh or recovery key' });
    return;
  }

  // 4. Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // 5. Atomically update password AND revoke all existing refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  // 6. Clear the refresh token cookie on this device too
  res.clearCookie(COOKIE_NAME, refreshCookieOptions());

  res.status(200).json({
    message:
      'Password updated successfully. All active sessions have been revoked. Please log in again.',
  });
}

export async function rotateRecoveryKey(req: Request, res: Response): Promise<void> {
  const parsed = rotateRecoveryKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = await bcrypt.hash(hashRecoveryKey(recoveryKey), BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: req.userId! },
    data: { recoveryKeyHash },
  });

  res.json({
    message: 'Recovery key rotated. The previous key is no longer valid.',
    recoveryKey,
  });
}
