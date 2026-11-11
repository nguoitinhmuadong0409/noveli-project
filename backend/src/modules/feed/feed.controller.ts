import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';

const uuidSchema = z.string().uuid();

const createPostSchema = z.object({
  bookId: z.string().uuid(),
  caption: z.string().trim().min(1).max(2000),
  image: z.string().url().max(2000),
  currentPage: z.number().int().min(0).nullable().optional(),
});

const commentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

type PostRow = {
  id: string;
  userId: string;
  bookId: string;
  caption: string;
  image: string;
  currentPage: number | null;
  createdAt: Date;
};

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role?.toLowerCase() === 'admin';
}

// Ghép thông tin tác giả, sách, lượt thích, bình luận vào từng bài đăng.
async function hydratePosts(rows: PostRow[], viewerId: string) {
  if (rows.length === 0) return [];

  const postIds = rows.map((p) => p.id);
  const bookIds = Array.from(new Set(rows.map((p) => p.bookId)));

  const [likes, comments, books] = await Promise.all([
    prisma.feedPostLike.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true, userId: true },
    }),
    prisma.feedPostComment.findMany({
      where: { postId: { in: postIds } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: {
        id: true,
        title: true,
        authors: true,
        coverUrl: true,
        driveFileId: true,
        pageCount: true,
        categories: true,
        avgRating: true,
      },
    }),
  ]);

  const userIds = Array.from(
    new Set([...rows.map((p) => p.userId), ...comments.map((c) => c.userId)]),
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, biDanh: true, avatarSeed: true },
  });

  const userMap = new Map<string, (typeof users)[number]>();
  users.forEach((u) => userMap.set(u.id, u));
  const bookMap = new Map<string, (typeof books)[number]>();
  books.forEach((b) => bookMap.set(b.id, b));

  const result = [];
  for (const p of rows) {
    const author = userMap.get(p.userId);
    const book = bookMap.get(p.bookId);
    if (!author || !book) continue;

    const postLikes = likes.filter((l) => l.postId === p.id);
    const postComments = comments.filter((c) => c.postId === p.id);

    result.push({
      id: p.id,
      author: { id: author.id, biDanh: author.biDanh, avatarSeed: author.avatarSeed },
      book: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        driveFileId: book.driveFileId,
        pageCount: book.pageCount,
        categories: book.categories,
        avgRating: Number(book.avgRating),
      },
      image: p.image,
      caption: p.caption,
      likesCount: postLikes.length,
      isLiked: postLikes.some((l) => l.userId === viewerId),
      isSaved: false,
      commentsCount: postComments.length,
      currentPage: p.currentPage ?? undefined,
      pageCount: book.pageCount ?? undefined,
      hasSpoilers: false,
      createdAt: p.createdAt.toISOString(),
      comments: postComments.slice(-20).map((c) => ({
        id: c.id,
        author: userMap.get(c.userId)?.biDanh ?? 'Người dùng',
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  }
  return result;
}

// GET /api/v1/feed/posts
export async function listPosts(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit as string) || 20));

  const rows = await prisma.feedPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const posts = await hydratePosts(rows, userId);
  res.json({ posts });
}

// POST /api/v1/feed/posts
export async function createPost(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dữ liệu bài đăng không hợp lệ', details: parsed.error.flatten() });
    return;
  }

  const { bookId, caption, image, currentPage } = parsed.data;

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
  if (!book) {
    res.status(404).json({ error: 'Không tìm thấy sách' });
    return;
  }

  const row = await prisma.feedPost.create({
    data: { userId, bookId, caption, image, currentPage: currentPage ?? null },
  });

  const [post] = await hydratePosts([row], userId);
  res.status(201).json({ post });
}

// DELETE /api/v1/feed/posts/:id
export async function deletePost(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: 'Mã bài đăng không hợp lệ' });
    return;
  }
  const id = idParsed.data;

  const post = await prisma.feedPost.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    return;
  }

  if (post.userId !== userId && !(await isAdmin(userId))) {
    res.status(403).json({ error: 'Bạn không có quyền xóa bài đăng này' });
    return;
  }

  await prisma.feedPost.delete({ where: { id } });
  res.json({ success: true });
}

// POST /api/v1/feed/posts/:id/like  (bấm lần nữa để bỏ thích)
export async function toggleLike(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: 'Mã bài đăng không hợp lệ' });
    return;
  }
  const postId = idParsed.data;

  const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    return;
  }

  const existing = await prisma.feedPostLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.feedPostLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedPostLike.create({ data: { postId, userId } });
  }

  const likesCount = await prisma.feedPostLike.count({ where: { postId } });
  res.json({ liked: !existing, likesCount });
}

// POST /api/v1/feed/posts/:id/comments
export async function addComment(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: 'Mã bài đăng không hợp lệ' });
    return;
  }
  const postId = idParsed.data;

  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Bình luận không hợp lệ' });
    return;
  }

  const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    res.status(404).json({ error: 'Không tìm thấy bài đăng' });
    return;
  }

  const comment = await prisma.feedPostComment.create({
    data: { postId, userId, content: parsed.data.content },
  });
  const author = await prisma.user.findUnique({ where: { id: userId }, select: { biDanh: true } });

  res.status(201).json({
    comment: {
      id: comment.id,
      author: author?.biDanh ?? 'Người dùng',
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
