import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const monthParam = req.query.month;
  const yearParam = req.query.year;

  if (
    (monthParam !== undefined && (typeof monthParam !== 'string' || !/^\d{1,2}$/.test(monthParam))) ||
    (yearParam !== undefined && (typeof yearParam !== 'string' || !/^\d{4}$/.test(yearParam)))
  ) {
    res.status(400).json({ error: 'Month and year must be integers' });
    return;
  }

  const month = monthParam === undefined ? now.getUTCMonth() + 1 : Number(monthParam);
  const year = yearParam === undefined ? currentYear : Number(yearParam);

  if (month < 1 || month > 12 || year < 2000 || year > currentYear || (year === currentYear && month > now.getUTCMonth() + 1)) {
    res.status(400).json({ error: 'Invalid leaderboard month or year' });
    return;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));
  const period = { gte: startDate, lt: endDate };
  const aggregates = await prisma.readingLog.groupBy({
    by: ['userId'],
    where: { loggedAt: period },
    _sum: { pagesRead: true, durationMinutes: true },
    _count: { id: true },
  });

  if (aggregates.length === 0) {
    res.json({ month, year, leaderboard: [] });
    return;
  }

  const userIds = aggregates.map((row) => row.userId);
  const [users, booksByUser] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, biDanh: true },
    }),
    prisma.readingLog.groupBy({
      by: ['userId', 'bookId'],
      where: { userId: { in: userIds }, loggedAt: period },
    }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const booksReadByUser = new Map<string, number>();

  for (const row of booksByUser) {
    booksReadByUser.set(row.userId, (booksReadByUser.get(row.userId) ?? 0) + 1);
  }

  const leaderboard = aggregates
    .map((row) => {
      const user = usersById.get(row.userId);
      if (!user) return null;

      return {
        biDanh: user.biDanh,
        pagesRead: row._sum.pagesRead ?? 0,
        minutesRead: row._sum.durationMinutes ?? 0,
        sessionsCount: row._count.id,
        booksRead: booksReadByUser.get(row.userId) ?? 0,
      };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) =>
      b.pagesRead - a.pagesRead ||
      b.minutesRead - a.minutesRead ||
      b.sessionsCount - a.sessionsCount ||
      a.biDanh.localeCompare(b.biDanh),
    )
    .slice(0, 100)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  res.json({ month, year, leaderboard });
}
