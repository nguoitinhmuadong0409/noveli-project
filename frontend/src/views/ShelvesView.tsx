import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ShelfType } from '@prisma/client';
import { z } from 'zod';

const upsertShelfSchema = z.object({
  bookId: z.string().uuid(),
  type: z.nativeEnum(ShelfType),
  customShelfName: z.string().max(100).optional(),
});

export async function upsertShelf(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = upsertShelfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { bookId, type, customShelfName } = parsed.data;

  // "Đã hoàn thành" chỉ do máy chủ đặt khi người dùng thật sự đọc hết sách trong trình đọc.
  if (type === ShelfType.READ) {
    res.status(403).json({ error: 'Sách chỉ được chuyển sang Đã hoàn thành khi bạn đọc hết trong trình đọc.' });
    return;
  }

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  const shelf = await prisma.shelf.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: {
      type,
      customShelfName: customShelfName ?? null,
      startedAt: type === ShelfType.CURRENTLY_READING ? new Date() : undefined,
    },
    create: {
      userId,
      bookId,
      type,
      customShelfName: customShelfName ?? null,
      startedAt: type === ShelfType.CURRENTLY_READING ? new Date() : null,
    },
  });

  res.json({ shelf });
}

export async function getUserShelves(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const type = req.query.type as ShelfType | undefined;

  const shelves = await prisma.shelf.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          authors: true,
          coverUrl: true,
          driveFileId: true,
          pageCount: true,
          avgRating: true,
          categories: true,
        },
      },
    },
  });

  res.json({ shelves });
}

// Trang đọc được ghi tự động từ trình đọc (xem module reader), không cho tự gửi số trang.
export async function updateProgress(_req: Request, res: Response): Promise<void> {
  res.status(403).json({ error: 'Tiến độ đọc được ghi tự động khi bạn đọc sách trong trình đọc.' });
}

export async function deleteShelf(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const bookId = req.params.bookId as string;

  await prisma.shelf.deleteMany({
    where: { userId, bookId },
  });

  res.json({ success: true, message: 'Book removed from shelf' });
}
