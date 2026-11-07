import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../../config/prisma';
import { cacheGet, cacheSet, cacheDel } from '../../config/redis';
import { z } from 'zod';

const BOOK_CACHE_TTL = 60 * 60 * 6; // 6 hours
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// ─── Normalize Google Books API response ─────────────────────────────────────
function normalizeGoogleBook(volume: Record<string, unknown>): Record<string, unknown> {
  const info = volume.volumeInfo as Record<string, unknown>;
  const isbns = ((info.industryIdentifiers as Array<{ type: string; identifier: string }>) ?? []);
  const isbn13 = isbns.find((i) => i.type === 'ISBN_13')?.identifier ?? null;
  const coverUrl =
    (info.imageLinks as Record<string, string>)?.thumbnail?.replace('http://', 'https://') ?? null;

  return {
    googleBookId: String(volume.id ?? ''),
    isbn13,
    title: String(info.title ?? 'Unknown Title'),
    authors: Array.isArray(info.authors) ? info.authors : [],
    description: typeof info.description === 'string' ? info.description : null,
    coverUrl,
    pageCount: typeof info.pageCount === 'number' ? info.pageCount : null,
    categories: Array.isArray(info.categories) ? info.categories : [],
    publishedDate: typeof info.publishedDate === 'string' ? info.publishedDate : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/books
// ─────────────────────────────────────────────────────────────────────────────

export async function listBooks(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const sort = (req.query.sort as string) || 'rating';

  const whereClause: Record<string, unknown> = {};

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

  await cacheSet(cacheKey, { books, total }, 600); // 10 minutes cache

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
//  GET /api/v1/books/search?q=&isbn=
// ─────────────────────────────────────────────────────────────────────────────

export async function searchBooks(req: Request, res: Response): Promise<void> {
  const query = req.query.q as string | undefined;
  const isbn = req.query.isbn as string | undefined;

  if (!query && !isbn) {
    res.status(400).json({ error: 'Provide either q (search query) or isbn parameter' });
    return;
  }

  const cacheKey = `books:search:${isbn ?? query}`;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) {
    res.json({ books: cached, source: 'cache' });
    return;
  }

  // Build Google Books search query
  let googleQuery = '';
  if (isbn) {
    googleQuery = `isbn:${isbn}`;
  } else if (query) {
    googleQuery = query;
  }

  try {
    const response = await axios.get(GOOGLE_BOOKS_API, {
      params: { q: googleQuery, maxResults: 10, fields: 'items(id,volumeInfo)' },
      timeout: 5000,
    });

    const items: Record<string, unknown>[] = response.data?.items ?? [];
    const normalizedBooks = items.map(normalizeGoogleBook);

    // Lazy-sync: upsert books found from Google Books into our DB
    for (const book of normalizedBooks) {
      if (book.googleBookId) {
        await prisma.book.upsert({
          where: { googleBookId: String(book.googleBookId) },
          update: {
            title: String(book.title),
            authors: book.authors as string[],
            coverUrl: book.coverUrl as string | null,
            pageCount: book.pageCount as number | null,
          },
          create: {
            googleBookId: String(book.googleBookId),
            isbn13: book.isbn13 as string | null,
            title: String(book.title),
            authors: book.authors as string[],
            description: book.description as string | null,
            coverUrl: book.coverUrl as string | null,
            pageCount: book.pageCount as number | null,
            categories: book.categories as string[],
            publishedDate: book.publishedDate as string | null,
          },
        }).catch(() => {});
      }
    }

    await cacheSet(cacheKey, normalizedBooks, BOOK_CACHE_TTL);
    res.json({ books: normalizedBooks, source: 'google_books' });
  } catch (err) {
    console.error('[Books] Google Books API error:', err);
    res.status(502).json({ error: 'Book search service temporarily unavailable' });
  }
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
