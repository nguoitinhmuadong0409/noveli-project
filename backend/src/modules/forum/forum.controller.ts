import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { generateForumIdentity } from '../../utils/forumIdentity';
import { createThreadSchema, createPostSchema } from '../../utils/validation';

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/forum/threads
// ─────────────────────────────────────────────────────────────────────────────

export async function createThread(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = createThreadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { bookId, title, content, tags, hasSpoilers } = parsed.data;

  // Validate bookId exists if provided
  if (bookId) {
    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
  }

  // We need a temporary ID to generate the identity for the thread creator.
  // We generate it here, create the thread with it, then the hash is locked in.
  const tempThreadId = crypto.randomUUID();
  const { authorHash, displayAlias } = generateForumIdentity(userId, tempThreadId, null);

  try {
    const thread = await prisma.thread.create({
      data: {
        id: tempThreadId,
        bookId: bookId ?? null,
        title,
        content,
        tags,
        hasSpoilers,
        authorHash,
        displayAlias,
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        hasSpoilers: true,
        displayAlias: true,
        isOp: true,
        viewsCount: true,
        postsCount: true,
        createdAt: true,
        book: { select: { id: true, title: true, coverUrl: true } },
      },
    });

    res.status(201).json({ thread: { ...thread, isOp: true } });
  } catch (err) {
    console.error('[Forum] createThread error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/forum/threads/:threadId
// ─────────────────────────────────────────────────────────────────────────────

export async function getThread(req: Request, res: Response): Promise<void> {
  const threadId = req.params.threadId as string;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      book: { select: { id: true, title: true, coverUrl: true, authors: true } },
      _count: { select: { posts: true } },
    },
  });

  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  await prisma.thread
    .update({
      where: { id: threadId },
      data: { viewsCount: { increment: 1 } },
    })
    .catch(() => {});

  res.json({ thread });
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/forum/threads — list with pagination
// ─────────────────────────────────────────────────────────────────────────────

export async function listThreads(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const bookId = req.query.bookId as string | undefined;
  const tag = req.query.tag as string | undefined;

  const where: Record<string, unknown> = {};
  if (bookId) where['bookId'] = bookId;
  if (tag) where['tags'] = { has: tag };

  const [threads, total] = await Promise.all([
    prisma.thread.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        tags: true,
        hasSpoilers: true,
        displayAlias: true,
        viewsCount: true,
        postsCount: true,
        createdAt: true,
        isPinned: true,
        book: { select: { id: true, title: true, coverUrl: true } },
      },
    }),
    prisma.thread.count({ where }),
  ]);

  res.json({
    threads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/forum/posts
// ─────────────────────────────────────────────────────────────────────────────

export async function createPost(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { threadId, parentPostId, content, hasSpoilers } = parsed.data;

  // Fetch thread to verify existence and get authorHash for OP detection
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, authorHash: true, isLocked: true },
  });

  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  if (thread.isLocked) {
    res.status(403).json({ error: 'This thread is locked and no longer accepts replies' });
    return;
  }

  // Validate parentPostId if provided
  if (parentPostId) {
    const parentPost = await prisma.post.findUnique({
      where: { id: parentPostId },
      select: { threadId: true },
    });
    if (!parentPost || parentPost.threadId !== threadId) {
      res.status(400).json({ error: 'Invalid parentPostId: post does not belong to this thread' });
      return;
    }
  }

  // Generate forum identity for this (userId, threadId) pair
  const { authorHash, displayAlias, isOp } = generateForumIdentity(
    userId,
    threadId,
    thread.authorHash,
  );

  try {
    const [post] = await prisma.$transaction([
      prisma.post.create({
        data: {
          threadId,
          parentPostId: parentPostId ?? null,
          content,
          hasSpoilers,
          authorHash,
          displayAlias,
          isOp,
        },
        select: {
          id: true,
          threadId: true,
          parentPostId: true,
          content: true,
          hasSpoilers: true,
          displayAlias: true,
          isOp: true,
          upvotes: true,
          createdAt: true,
        },
      }),
      prisma.thread.update({
        where: { id: threadId },
        data: { postsCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ post });
  } catch (err) {
    console.error('[Forum] createPost error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/forum/threads/:threadId/posts
// ─────────────────────────────────────────────────────────────────────────────

export async function getThreadPosts(req: Request, res: Response): Promise<void> {
  const threadId = req.params.threadId as string;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(50, parseInt(req.query.limit as string) || 30);

  const posts = await prisma.post.findMany({
    where: { threadId: { equals: threadId }, parentPostId: null },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      content: true,
      hasSpoilers: true,
      displayAlias: true,
      isOp: true,
      upvotes: true,
      createdAt: true,
      replies: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          hasSpoilers: true,
          displayAlias: true,
          isOp: true,
          upvotes: true,
          createdAt: true,
          parentPostId: true,
        },
      },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  res.json({ posts: items, nextCursor, hasMore });
}
