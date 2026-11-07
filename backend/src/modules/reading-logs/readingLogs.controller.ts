import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { syncReadingLogsSchema } from '../../utils/validation';
import { Prisma, ShelfType, GoalStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncResult {
  clientLogId: string;
  status: 'created' | 'duplicate' | 'error';
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStreakUpdate(
  currentStreak: number,
  longestStreak: number,
  lastReadDate: Date | null,
  todayUTC: Date,
): { currentStreak: number; longestStreak: number; lastReadDate: Date } {
  const todayStr = todayUTC.toISOString().slice(0, 10);

  if (lastReadDate) {
    const lastStr = lastReadDate.toISOString().slice(0, 10);
    if (lastStr === todayStr) {
      return { currentStreak, longestStreak, lastReadDate };
    }

    const yesterday = new Date(todayUTC);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (lastStr === yesterdayStr) {
      const newStreak = currentStreak + 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
        lastReadDate: todayUTC,
      };
    }
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, 1),
    lastReadDate: todayUTC,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/reading-logs/sync
// ─────────────────────────────────────────────────────────────────────────────

export async function syncReadingLogs(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = syncReadingLogsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { logs } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastReadDate: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const results: SyncResult[] = [];
  let { currentStreak, longestStreak } = user;
  let lastReadDate: Date | null = user.lastReadDate;

  const currentYear = new Date().getUTCFullYear();

  for (const entry of logs) {
    const { clientLogId, bookId, currentPage, startPage, durationMinutes, note, loggedAt } = entry;

    try {
      await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Idempotency check
          const existing = await tx.readingLog.findUnique({
            where: { clientLogId },
            select: { id: true },
          });

          if (existing) {
            results.push({ clientLogId, status: 'duplicate' });
            return;
          }

          const book = await tx.book.findUnique({
            where: { id: bookId },
            select: { id: true, pageCount: true },
          });

          if (!book) throw new Error(`Book ${bookId} not found`);

          let shelf = await tx.shelf.findUnique({
            where: { userId_bookId: { userId, bookId } },
            select: { id: true, currentPage: true, type: true, startedAt: true },
          });

          const prevPage = shelf?.currentPage ?? 0;
          const newPage = Math.max(prevPage, currentPage);
          const pagesRead = Math.max(0, currentPage - startPage);

          if (!shelf) {
            shelf = await tx.shelf.create({
              data: {
                userId,
                bookId,
                type: ShelfType.CURRENTLY_READING,
                currentPage: newPage,
                startedAt: new Date(loggedAt),
              },
              select: { id: true, currentPage: true, type: true, startedAt: true },
            });
          }

          const isBookCompleted =
            book.pageCount != null &&
            newPage >= book.pageCount &&
            shelf.type !== ShelfType.READ;

          // Create ReadingLog record
          await tx.readingLog.create({
            data: {
              clientLogId,
              userId,
              bookId,
              startPage,
              endPage: currentPage,
              pagesRead,
              durationMinutes,
              note: note ?? null,
              loggedAt: new Date(loggedAt),
            },
          });

          // Update shelf
          const shelfUpdateData: Prisma.ShelfUpdateInput = {
            currentPage: newPage,
            updatedAt: new Date(),
          };

          if (isBookCompleted) {
            shelfUpdateData.type = ShelfType.READ;
            shelfUpdateData.finishedAt = new Date(loggedAt);
          } else if (shelf.type === ShelfType.WANT_TO_READ) {
            shelfUpdateData.type = ShelfType.CURRENTLY_READING;
            shelfUpdateData.startedAt = new Date(loggedAt);
          }

          await tx.shelf.update({
            where: { userId_bookId: { userId, bookId } },
            data: shelfUpdateData,
          });

          // Update / Upsert Goal
          const goalUpdateData: Prisma.GoalUpdateInput = {
            completedPages: { increment: pagesRead },
            updatedAt: new Date(),
          };

          if (isBookCompleted) {
            goalUpdateData.completedBooks = { increment: 1 };
          }

          await tx.goal.upsert({
            where: { userId_year: { userId, year: currentYear } },
            update: goalUpdateData,
            create: {
              userId,
              year: currentYear,
              targetBooks: 12,
              completedBooks: isBookCompleted ? 1 : 0,
              completedPages: pagesRead,
              status: GoalStatus.ACTIVE,
            },
          });

          // Auto-complete goal check
          const updatedGoal = await tx.goal.findUnique({
            where: { userId_year: { userId, year: currentYear } },
            select: { targetBooks: true, completedBooks: true, status: true },
          });

          if (
            updatedGoal &&
            updatedGoal.status === GoalStatus.ACTIVE &&
            updatedGoal.completedBooks >= updatedGoal.targetBooks
          ) {
            await tx.goal.update({
              where: { userId_year: { userId, year: currentYear } },
              data: { status: GoalStatus.COMPLETED },
            });
          }

          results.push({ clientLogId, status: 'created' });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 10000,
        },
      );

      // Update streak state in memory
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);

      const streakUpdate = computeStreakUpdate(currentStreak, longestStreak, lastReadDate, todayUTC);
      currentStreak = streakUpdate.currentStreak;
      longestStreak = streakUpdate.longestStreak;
      lastReadDate = streakUpdate.lastReadDate;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[ReadingLogs] Error processing clientLogId ${clientLogId}:`, message);
      results.push({ clientLogId, status: 'error', error: message });
    }
  }

  // Flush streak to DB once after entire batch
  await prisma.user
    .update({
      where: { id: userId },
      data: { currentStreak, longestStreak, lastReadDate },
    })
    .catch((err: unknown) => console.error('[ReadingLogs] Streak flush error:', err));

  const created = results.filter((r) => r.status === 'created').length;
  const duplicates = results.filter((r) => r.status === 'duplicate').length;
  const errors = results.filter((r) => r.status === 'error').length;

  res.status(errors === results.length && results.length > 0 ? 500 : errors > 0 ? 207 : 200).json({
    summary: { created, duplicates, errors, total: results.length },
    results,
    currentStreak,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/reading-logs
// ─────────────────────────────────────────────────────────────────────────────

export async function getReadingLogs(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const bookId = req.query.bookId as string | undefined;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

  const where: Prisma.ReadingLogWhereInput = { userId };
  if (bookId) where.bookId = bookId;

  const logs = await prisma.readingLog.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      clientLogId: true,
      bookId: true,
      startPage: true,
      endPage: true,
      pagesRead: true,
      durationMinutes: true,
      note: true,
      loggedAt: true,
      book: { select: { title: true, coverUrl: true } },
    },
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  res.json({ logs: items, nextCursor, hasMore });
}
