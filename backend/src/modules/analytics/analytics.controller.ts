import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ShelfType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/analytics/dashboard
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const currentYear = new Date().getUTCFullYear();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [user, goal, recentStats, shelvesCounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        biDanh: true,
        avatarSeed: true,
        currentStreak: true,
        longestStreak: true,
        lastReadDate: true,
        createdAt: true,
      },
    }),
    prisma.goal.findUnique({
      where: { userId_year: { userId, year: currentYear } },
    }),
    prisma.readingLog.aggregate({
      where: { userId, loggedAt: { gte: thirtyDaysAgo } },
      _sum: { pagesRead: true, durationMinutes: true },
      _count: { id: true },
    }),
    prisma.shelf.groupBy({
      by: ['type'],
      where: { userId },
      _count: { id: true },
    }),
  ]);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const shelfSummary: Partial<Record<ShelfType, number>> = {};
  for (const row of shelvesCounts) {
    shelfSummary[row.type] = row._count.id;
  }

  res.json({
    user,
    goal: goal ?? null,
    last30Days: {
      pagesRead: recentStats._sum.pagesRead ?? 0,
      minutesRead: recentStats._sum.durationMinutes ?? 0,
      sessionsCount: recentStats._count.id,
    },
    shelfSummary,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/analytics/reading-chart
// ─────────────────────────────────────────────────────────────────────────────

export async function getReadingChart(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const year = parseInt(req.query.year as string) || new Date().getUTCFullYear();
  const month = req.query.month ? parseInt(req.query.month as string) : null;

  let startDate: Date;
  let endDate: Date;

  if (month !== null) {
    startDate = new Date(Date.UTC(year, month - 1, 1));
    endDate = new Date(Date.UTC(year, month, 1));
  } else {
    startDate = new Date(Date.UTC(year, 0, 1));
    endDate = new Date(Date.UTC(year + 1, 0, 1));
  }

  const logs = await prisma.readingLog.findMany({
    where: { userId, loggedAt: { gte: startDate, lt: endDate } },
    select: { pagesRead: true, durationMinutes: true, loggedAt: true },
    orderBy: { loggedAt: 'asc' },
  });

  const byDate: Record<string, { pages: number; minutes: number }> = {};
  for (const log of logs) {
    const dateKey = log.loggedAt.toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = { pages: 0, minutes: 0 };
    byDate[dateKey].pages += log.pagesRead;
    byDate[dateKey].minutes += log.durationMinutes;
  }

  const chartData = Object.entries(byDate).map(([date, stats]) => ({ date, ...stats }));
  res.json({ chartData, year, month });
}
