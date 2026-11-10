import { z } from 'zod';

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  biDanh: z
    .string()
    .min(3, 'biDanh must be at least 3 characters')
    .max(30, 'biDanh must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_\-.àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]+$/,
      'biDanh can only contain letters, numbers, and - _ .',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  ownerSetupKey: z.string().min(1).max(256).optional(),
  deviceType: z.enum(['web', 'pwa', 'android', 'ios']).optional().default('web'),
});

export const loginSchema = z.object({
  biDanh: z.string().min(1, 'biDanh is required').max(30),
  password: z.string().min(1, 'Password is required').max(128),
  deviceType: z.enum(['web', 'pwa', 'android', 'ios']).optional().default('web'),
});

export const recoverPasswordSchema = z.object({
  biDanh: z.string().min(3).max(30),
  recoveryKey: z
    .string()
    .regex(/^BKHL-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i, 'Invalid recovery key format'),
  newPassword: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  avatarSeed: z.string().max(64).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export const rotateRecoveryKeySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
});

// ─── Forum Schemas ───────────────────────────────────────────────────────────

export const createThreadSchema = z.object({
  bookId: z.string().uuid().optional(),
  title: z.string().min(5).max(300),
  content: z.string().min(10).max(10000),
  tags: z.array(z.string().max(50)).max(10).default([]),
  hasSpoilers: z.boolean().default(false),
});

export const createPostSchema = z.object({
  threadId: z.string().uuid(),
  parentPostId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  hasSpoilers: z.boolean().default(false),
});

// ─── Reading Logs Schemas ────────────────────────────────────────────────────

export const readingLogEntrySchema = z
  .object({
    clientLogId: z.string().uuid(),
    bookId: z.string().uuid(),
    currentPage: z.number().int().min(0).max(100000),
    startPage: z.number().int().min(0).max(100000),
    durationMinutes: z.number().int().min(0).max(1440).default(0),
    note: z.string().max(500).optional(),
    loggedAt: z.string().datetime(),
  })
  .refine((entry) => entry.currentPage >= entry.startPage, {
    message: 'currentPage must be greater than or equal to startPage',
    path: ['currentPage'],
  });

export const syncReadingLogsSchema = z.object({
  logs: z.array(readingLogEntrySchema).min(1).max(100),
});

// ─── AI Schemas ──────────────────────────────────────────────────────────────

export const aiRecommendationSchema = z.object({
  favoriteBooks: z
    .array(
      z.object({
        title: z.string(),
        author: z.string().optional(),
      }),
    )
    .max(10)
    .default([]),
  moodPrompt: z.string().max(300).optional(),
});
