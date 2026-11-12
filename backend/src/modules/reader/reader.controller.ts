import { Request, Response } from 'express';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { z } from 'zod';
import { ShelfType } from '@prisma/client';
import { prisma } from '../../config/prisma';

// ─── Các mức chống gian lận (có thể chỉnh) ───────────────────────────────────
const MIN_SECONDS_PER_PAGE = 15; // phải ở lại trang ít nhất 15 giây mới được tính
const MAX_HEARTBEAT_GAP_SECONDS = 25; // khoảng cách tối đa giữa 2 lần báo để còn tính là đang đọc
const MAX_CREDITS_PER_DAY = 300; // số trang tối đa được tính mỗi ngày
const COMPLETE_RATIO = 0.8; // đọc đủ 80% số trang (và tới trang cuối) thì hoàn thành
const SESSION_GAP_MS = 10 * 60 * 1000; // nghỉ quá 10 phút thì tính là phiên đọc mới
const MIN_CREDIT_INTERVAL_MS = 14000; // giữa 2 trang được tính (mọi sách) cách nhau tối thiểu 14 giây
const MAX_PAGE = 5000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // múi giờ Việt Nam

function vnDayKey(d: Date): string {
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function vnDayStart(d: Date): Date {
  const t = d.getTime() + VN_OFFSET_MS;
  return new Date(Math.floor(t / 86400000) * 86400000 - VN_OFFSET_MS);
}

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role?.toLowerCase() === 'admin';
}

// Cập nhật chuỗi đọc liên tiếp (streak) theo ngày Việt Nam.
async function touchStreak(userId: string, now: Date): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastReadDate: true },
  });
  if (!user) return;

  const today = vnDayKey(now);
  const last = user.lastReadDate ? vnDayKey(user.lastReadDate) : null;
  if (last === today) return;

  const yesterday = vnDayKey(new Date(now.getTime() - 86400000));
  const next = last === yesterday ? user.currentStreak + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: next,
      longestStreak: Math.max(user.longestStreak, next),
      lastReadDate: now,
    },
  });
}

// ─── GET /api/v1/reader/:bookId/file  (chuyển PDF từ Google Drive) ──────────
export async function streamBookFile(req: Request, res: Response): Promise<void> {
  const parsedId = z.string().uuid().safeParse(req.params.bookId);
  if (!parsedId.success) {
    res.status(400).json({ error: 'Mã sách không hợp lệ' });
    return;
  }

  const book = await prisma.book.findUnique({
    where: { id: parsedId.data },
    select: { driveFileId: true },
  });
  if (!book || !book.driveFileId) {
    res.status(404).json({ error: 'Sách này chưa có file để đọc' });
    return;
  }

  const url = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
    book.driveFileId,
  )}&export=download&confirm=t`;

  try {
    const upstream = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    const stream = upstream.data as Readable;
    const contentType = String(upstream.headers['content-type'] || '');

    if (upstream.status !== 200 || contentType.includes('text/html')) {
      stream.destroy();
      res.status(502).json({
        error:
          'Không tải được file từ Google Drive. Hãy chắc file đang chia sẻ ở chế độ "Bất kỳ ai có đường liên kết".',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const length = upstream.headers['content-length'];
    if (length) res.setHeader('Content-Length', String(length));
    stream.pipe(res);
  } catch (err) {
    console.error('[Reader] Lỗi tải file Drive:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Không tải được file sách, hãy thử lại sau.' });
    }
  }
}

// ─── GET /api/v1/reader/:bookId/state ────────────────────────────────────────
export async function getState(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const parsedId = z.string().uuid().safeParse(req.params.bookId);
  if (!parsedId.success) {
    res.status(400).json({ error: 'Mã sách không hợp lệ' });
    return;
  }
  const bookId = parsedId.data;
  const dayStart = vnDayStart(new Date());

  const [book, shelf, creditedCount, dailyCredits] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId }, select: { pageCount: true } }),
    prisma.shelf.findUnique({ where: { userId_bookId: { userId, bookId } } }),
    prisma.readingPageCredit.count({ where: { userId, bookId } }),
    prisma.readingPageCredit.count({ where: { userId, creditedAt: { gte: dayStart } } }),
  ]);

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  res.json({
    currentPage: shelf && shelf.currentPage > 0 ? shelf.currentPage : 1,
    creditedCount,
    totalPages: book.pageCount ?? null,
    shelfType: shelf?.type ?? null,
    dailyCredits,
    dailyLimit: MAX_CREDITS_PER_DAY,
  });
}

// ─── GET /api/v1/reader/summary ──────────────────────────────────────────────
export async function getSummary(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const dayStart = vnDayStart(new Date());

  const [creditedPages, creditedToday] = await Promise.all([
    prisma.readingPageCredit.count({ where: { userId } }),
    prisma.readingPageCredit.count({ where: { userId, creditedAt: { gte: dayStart } } }),
  ]);

  res.json({ creditedPages, creditedToday });
}

// ─── POST /api/v1/reader/progress ────────────────────────────────────────────
const progressSchema = z.object({
  bookId: z.string().uuid(),
  page: z.number().int().min(1).max(MAX_PAGE),
  totalPages: z.number().int().min(1).max(MAX_PAGE).optional(),
});

export async function reportProgress(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() });
    return;
  }
  const { bookId, page, totalPages } = parsed.data;

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, pageCount: true },
  });
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  // Số trang của sách: lấy từ database. Nếu admin chưa nhập, lần admin mở sách sẽ tự điền.
  let total: number | null = book.pageCount && book.pageCount > 0 ? book.pageCount : null;
  if (!total && totalPages && (await isAdmin(userId))) {
    await prisma.book.update({ where: { id: bookId }, data: { pageCount: totalPages } });
    total = totalPages;
  }
  if (total && page > total) {
    res.status(400).json({ error: 'Số trang vượt quá số trang của sách' });
    return;
  }

  const now = new Date();
  const dayStart = vnDayStart(now);
  const track = await prisma.readingTrack.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  // Thời gian "đang đọc" trên trang hiện tại do máy chủ tự đo, không tin đồng hồ của máy người dùng.
  let activeSeconds = 0;
  if (track && track.page === page) {
    const gap = (now.getTime() - track.lastAt.getTime()) / 1000;
    if (gap < 1) {
      res.json({ ignored: true });
      return;
    }
    activeSeconds = track.activeSeconds + (gap <= MAX_HEARTBEAT_GAP_SECONDS ? Math.floor(gap) : 0);
  }

  const existingCredit = await prisma.readingPageCredit.findUnique({
    where: { userId_bookId_page: { userId, bookId, page } },
    select: { id: true },
  });

  let credited = false;
  let dailyLimitReached = false;

  let session = {
    logId: track?.logId ?? null,
    sessionStartPage: track?.sessionStartPage ?? 0,
    sessionPages: track?.sessionPages ?? 0,
    sessionSeconds: track?.sessionSeconds ?? 0,
    sessionLastCreditAt: track?.sessionLastCreditAt ?? null,
  };

  // Tính điểm cho trang hiện tại khi đã ở lại đủ lâu.
  if (!existingCredit && activeSeconds >= MIN_SECONDS_PER_PAGE) {
    const [todayCount, lastCredit] = await Promise.all([
      prisma.readingPageCredit.count({ where: { userId, creditedAt: { gte: dayStart } } }),
      prisma.readingPageCredit.findFirst({
        where: { userId },
        orderBy: { creditedAt: 'desc' },
        select: { creditedAt: true },
      }),
    ]);

    if (todayCount >= MAX_CREDITS_PER_DAY) {
      dailyLimitReached = true;
    } else if (
      !lastCredit ||
      now.getTime() - lastCredit.creditedAt.getTime() >= MIN_CREDIT_INTERVAL_MS
    ) {
      try {
        await prisma.readingPageCredit.create({ data: { userId, bookId, page } });
        credited = true;
      } catch {
        credited = false; // đã có bản ghi trùng, bỏ qua
      }
    }
  }

  if (credited) {
    const seconds = Math.min(activeSeconds, 300);
    const continuing =
      !!session.logId &&
      !!session.sessionLastCreditAt &&
      now.getTime() - session.sessionLastCreditAt.getTime() <= SESSION_GAP_MS;

    if (continuing && session.logId) {
      session.sessionPages += 1;
      session.sessionSeconds += seconds;
      await prisma.readingLog.update({
        where: { id: session.logId },
        data: {
          endPage: Math.max(page, session.sessionStartPage),
          pagesRead: session.sessionPages,
          durationMinutes: Math.ceil(session.sessionSeconds / 60),
        },
      });
    } else {
      const log = await prisma.readingLog.create({
        data: {
          clientLogId: randomUUID(),
          userId,
          bookId,
          startPage: page,
          endPage: page,
          pagesRead: 1,
          durationMinutes: Math.max(1, Math.ceil(seconds / 60)),
          loggedAt: now,
        },
      });
      session = {
        logId: log.id,
        sessionStartPage: page,
        sessionPages: 1,
        sessionSeconds: seconds,
        sessionLastCreditAt: now,
      };
    }
    session.sessionLastCreditAt = now;
    await touchStreak(userId, now);
  }

  const creditedCount = await prisma.readingPageCredit.count({ where: { userId, bookId } });
  const pageCredited = credited || !!existingCredit;

  // Hoàn thành: đang ở trang cuối đã được tính và đã đọc đủ tỉ lệ số trang.
  const completes =
    !!total && page === total && pageCredited && creditedCount >= Math.ceil(total * COMPLETE_RATIO);

  // Lưu vào kệ sách.
  const shelf = await prisma.shelf.findUnique({ where: { userId_bookId: { userId, bookId } } });
  let shelfType: ShelfType | null = shelf?.type ?? null;

  if (shelf) {
    const data: { currentPage?: number; type?: ShelfType; startedAt?: Date; finishedAt?: Date } = {};
    if (shelf.type !== ShelfType.READ) data.currentPage = page;

    if (
      credited &&
      (shelf.type === ShelfType.WANT_TO_READ || shelf.type === ShelfType.DID_NOT_FINISH)
    ) {
      data.type = ShelfType.CURRENTLY_READING;
      if (!shelf.startedAt) data.startedAt = now;
    }
    if (completes && shelf.type !== ShelfType.READ) {
      data.type = ShelfType.READ;
      data.finishedAt = now;
      if (total) data.currentPage = total;
    }

    const changed =
      (data.currentPage !== undefined && data.currentPage !== shelf.currentPage) ||
      data.type !== undefined;
    if (changed) {
      await prisma.shelf.update({ where: { id: shelf.id }, data });
    }
    shelfType = data.type ?? shelf.type;
  } else if (credited || completes) {
    const type = completes ? ShelfType.READ : ShelfType.CURRENTLY_READING;
    await prisma.shelf.create({
      data: {
        userId,
        bookId,
        type,
        currentPage: completes && total ? total : page,
        startedAt: now,
        finishedAt: completes ? now : null,
      },
    });
    shelfType = type;
  }

  await prisma.readingTrack.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, page, activeSeconds, lastAt: now, ...session },
    update: { page, activeSeconds, lastAt: now, ...session },
  });

  const dailyCredits = await prisma.readingPageCredit.count({
    where: { userId, creditedAt: { gte: dayStart } },
  });

  res.json({
    page,
    activeSeconds,
    minSeconds: MIN_SECONDS_PER_PAGE,
    credited,
    pageCredited,
    creditedCount,
    totalPages: total,
    shelfType,
    completed: shelfType === ShelfType.READ,
    dailyCredits,
    dailyLimit: MAX_CREDITS_PER_DAY,
    dailyLimitReached,
  });
}
