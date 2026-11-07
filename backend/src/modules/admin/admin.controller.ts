import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { isOwnerBiDanh } from '../../utils/owner';

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const [totalUsers, totalAdmins, totalBooks, totalReviews, totalThreads, totalPosts, users, currentUser] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.book.count(),
      prisma.review.count(),
      prisma.thread.count(),
      prisma.post.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          biDanh: true,
          role: true,
          currentStreak: true,
          createdAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { biDanh: true },
      }),
    ]);

  res.json({
    stats: { totalUsers, totalAdmins, totalBooks, totalReviews, totalThreads, totalPosts },
    isOwner: currentUser ? isOwnerBiDanh(currentUser.biDanh) : false,
    users,
  });
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const parsedUserId = z.string().uuid().safeParse(req.params.userId);
  if (!parsedUserId.success) {
    res.status(400).json({ error: 'A valid user ID is required' });
    return;
  }

  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'role must be user or admin' });
    return;
  }

  if (parsedUserId.data === req.userId) {
    res.status(400).json({ error: 'You cannot change your own admin role' });
    return;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: parsedUserId.data },
        select: { id: true, biDanh: true, role: true },
      });

      if (!target) return 'not_found' as const;
      if (isOwnerBiDanh(target.biDanh)) return 'owner_protected' as const;

      if (target.role === 'admin' && parsed.data.role === 'user') {
        const adminCount = await tx.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) return 'last_admin' as const;
      }

      await tx.user.update({
        where: { id: target.id },
        data: { role: parsed.data.role },
      });

      return 'updated' as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (result === 'not_found') {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (result === 'last_admin') {
    res.status(409).json({ error: 'At least one admin account must remain' });
    return;
  }

  if (result === 'owner_protected') {
    res.status(409).json({ error: 'The owner account role cannot be changed' });
    return;
  }

  res.json({ message: 'User role updated', role: parsed.data.role });
}
