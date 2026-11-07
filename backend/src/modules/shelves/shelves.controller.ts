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
      finishedAt: type === ShelfType.READ ? new Date() : undefined,
    },
    create: {
      userId,
      bookId,
      type,
      customShelfName: customShelfName ?? null,
      startedAt: type === ShelfType.CURRENTLY_READING ? new Date() : null,
      finishedAt: type === ShelfType.READ ? new Date() : null,
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
          pageCount: true,
          avgRating: true,
          categories: true,
        },
      },
    },
  });

  res.json({ shelves });
}

const updateProgressSchema = z.object({
  currentPage: z.number().int().min(0),
});

export async function updateProgress(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const bookId = req.params.bookId as string;

  const parsed = updateProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { currentPage } = parsed.data;

  const existingShelf = await prisma.shelf.findUnique({
    where: { userId_bookId: { userId, bookId } },
    include: { book: { select: { pageCount: true } } },
  });

  if (!existingShelf) {
    res.status(404).json({ error: 'Book is not on your shelf' });
    return;
  }

  const totalPages = existingShelf.book?.pageCount;
  const isFinished = totalPages ? currentPage >= totalPages : false;

  const updated = await prisma.shelf.update({
    where: { userId_bookId: { userId, bookId } },
    data: {
      currentPage,
      type: isFinished ? ShelfType.READ : existingShelf.type,
      finishedAt: isFinished ? new Date() : existingShelf.finishedAt,
    },
  });

  res.json({ shelf: updated, isFinished });
}

export async function deleteShelf(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const bookId = req.params.bookId as string;

  await prisma.shelf.deleteMany({
    where: { userId, bookId },
  });

  res.json({ success: true, message: 'Book removed from shelf' });
}
