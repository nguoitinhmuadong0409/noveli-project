import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { cacheGet, cacheSet, cacheDel } from '../../config/redis';
import { z } from 'zod';

const BOOK_CACHE_TTL = 60 * 60 * 6; // 6 hours

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/books  (chỉ sách đã có link Drive)
// ─────────────────────────────────────────────────────────────────────────────

export async function listBooks(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const sort = (req.query.sort as string) || 'rating';

  const whereClause: Record<string, unknown> = { driveFileId: { not: null } };

  if (category) {
    whereClause.categories = { has: category };
  }

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { authors: { has: search } },
    ];
  }

  let orderBy: Record<string, 'asc' | 'desc'> = { avgRating: 'desc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  else if (sort === 'title') orderBy = { title: 'asc' };

  const cacheKey = `books:list:${JSON.stringify({ page, limit, category, search, sort })}`;
  const cached = await cacheGet<{ books: unknown[]; total: number }>(cacheKey);
  if (cached) {
    res.json({
      books: cached.books,
      pagination: {
        page,
        limit,
        total: cached.total,
        totalPages: Math.ceil(cached.total / limit),
      },
      source: 'cache',
    });
    return;
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        authors: true,
        description: true,
        coverUrl: true,
        driveFileId: true,
        pageCount: true,
        categories: true,
        publishedDate: true,
        avgRating: true,
        ratingsCount: true,
        _count: {
          select: { reviews: true, shelves: true },
        },
      },
    }),
    prisma.book.count({ where: whereClause }),
  ]);

  await cacheSet(cacheKey, { books, total }, 60); // 1 minute cache

  res.json({
    books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    source: 'db',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/books/:id
// ─────────────────────────────────────────────────────────────────────────────

export async function getBook(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const cacheKey = `books:detail:${id}`;

  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) {
    res.json({ book: cached });
    return;
  }

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      _count: { select: { reviews: true, shelves: true } },
    },
  });

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  await cacheSet(cacheKey, book, BOOK_CACHE_TTL);
  res.json({ book });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/books/:id/reviews
// ─────────────────────────────────────────────────────────────────────────────

export async function getBookReviews(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { bookId: id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            biDanh: true,
            avatarSeed: true,
          },
        },
      },
    }),
    prisma.review.count({ where: { bookId: id } }),
  ]);

  // Privacy protection: Redact user details if review is marked anonymous
  const sanitizedReviews = reviews.map((r) => {
    if (r.isAnonymous) {
      return {
        ...r,
        user: null,
        authorName: r.anonymousAlias || 'Người Dùng Ẩn Danh',
      };
    }
    return {
      ...r,
      authorName: r.user.biDanh,
      avatarSeed: r.user.avatarSeed,
    };
  });

  res.json({
    reviews: sanitizedReviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/books/:id/reviews
// ─────────────────────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().min(5).max(5000),
  hasSpoilers: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  anonymousAlias: z.string().max(60).optional(),
});

export async function createBookReview(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const bookId = req.params.id as string;

  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { rating, content, hasSpoilers, isAnonymous, anonymousAlias } = parsed.data;

  // Check if book exists
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  // Upsert review (1 review per user per book)
  const review = await prisma.review.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: {
      rating,
      content,
      hasSpoilers,
      isAnonymous,
      anonymousAlias: isAnonymous ? anonymousAlias || 'Độc Giả Ẩn Danh' : null,
    },
    create: {
      userId,
      bookId,
      rating,
      content,
      hasSpoilers,
      isAnonymous,
      anonymousAlias: isAnonymous ? anonymousAlias || 'Độc Giả Ẩn Danh' : null,
    },
  });

  // Recalculate book average rating & count
  const aggregates = await prisma.review.aggregate({
    where: { bookId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avgRating = aggregates._avg.rating ? Number(aggregates._avg.rating.toFixed(2)) : 0;
  const ratingsCount = aggregates._count.rating || 0;

  await prisma.book.update({
    where: { id: bookId },
    data: { avgRating, ratingsCount },
  });

  // Invalidate cache
  await cacheDel(`books:detail:${bookId}`);

  res.status(201).json({ review });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: thêm / sửa / xóa sách
// ─────────────────────────────────────────────────────────────────────────────

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role?.toLowerCase() === 'admin';
}

function extractDriveFileId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{10,}$/.test(s) ? s : null;
}

const bookBodySchema = z.object({
  title: z.string().min(1).max(512),
  authors: z.array(z.string().min(1)).default([]),
  description: z.string().max(5000).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  pageCount: z.number().int().min(0).nullable().optional(),
  categories: z.array(z.string()).default([]),
  driveLink: z.string().min(1),
});

export async function createBook(req: Request, res: Response): Promise<void> {
  if (!(await isAdmin(req.userId!))) {
    res.status(403).json({ error: 'Chỉ admin mới được thêm sách' });
    return;
  }
  const parsed = bookBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { driveLink, ...rest } = parsed.data;
  const driveFileId = extractDriveFileId(driveLink);
  if (!driveFileId) {
    res.status(400).json({ error: 'Link Google Drive không hợp lệ' });
    return;
  }
  const book = await prisma.book.create({ data: { ...rest, driveFileId } });
  res.status(201).json({ book });
}

export async function updateBook(req: Request, res: Response): Promise<void> {
  if (!(await isAdmin(req.userId!))) {
    res.status(403).json({ error: 'Chỉ admin mới được sửa sách' });
    return;
  }
  const id = req.params.id as string;
  const parsed = bookBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }
  const { driveLink, ...rest } = parsed.data;
  const data: Prisma.BookUpdateInput = { ...rest };
  if (driveLink !== undefined) {
    const driveFileId = extractDriveFileId(driveLink);
    if (!driveFileId) {
      res.status(400).json({ error: 'Link Google Drive không hợp lệ' });
      return;
    }
    data.driveFileId = driveFileId;
  }
  try {
    const book = await prisma.book.update({ where: { id }, data });
    await cacheDel(`books:detail:${id}`);
    res.json({ book });
  } catch {
    res.status(404).json({ error: 'Book not found' });
  }
}

export async function deleteBook(req: Request, res: Response): Promise<void> {
  if (!(await isAdmin(req.userId!))) {
    res.status(403).json({ error: 'Chỉ admin mới được xóa sách' });
    return;
  }
  const id = req.params.id as string;
  try {
    await prisma.book.delete({ where: { id } });
    await cacheDel(`books:detail:${id}`);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Book not found' });
  }
}
