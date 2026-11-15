import { Request, Response } from 'express';
import crypto from 'crypto';
import OpenAI from 'openai';
import { prisma } from '../../config/prisma';
import { cacheGet, cacheSet } from '../../config/redis';
import { aiRecommendationSchema } from '../../utils/validation';
import { ENV } from '../../config/env';

const openai = ENV.OPENAI_API_KEY ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY }) : null;

const AI_CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

// ─── Types ────────────────────────────────────────────────────────────────────

interface FavoriteBook {
  title: string;
  author?: string;
}

interface BookRecommendation {
  title: string;
  author: string;
  category: string;
  matchScore: number;
  whyItMatches: string;
  estimatedReadingDays: number;
}

interface AIRecommendationResponse {
  readerPersonaSummary: string;
  recommendations: BookRecommendation[];
  source: 'cache' | 'openai';
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRequestHash(
  userBookTitles: string[],
  moodPrompt: string,
  avgPagesPerDay: number,
): string {
  const payload = JSON.stringify({
    books: userBookTitles.sort(),
    mood: moodPrompt.toLowerCase().trim(),
    speed: Math.round(avgPagesPerDay),
  });
  return crypto.createHash('md5').update(payload).digest('hex');
}

async function computeAvgPagesPerDay(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.readingLog.aggregate({
    where: { userId, loggedAt: { gte: thirtyDaysAgo } },
    _sum: { pagesRead: true },
    _count: { id: true },
  });

  const totalPages = result._sum.pagesRead ?? 0;
  if (totalPages === 0) return 30;

  const daysWithData = Math.min(30, result._count.id);
  return Math.round(totalPages / Math.max(1, daysWithData));
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/ai/recommendations
// ─────────────────────────────────────────────────────────────────────────────

export async function getAIRecommendations(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const parsed = aiRecommendationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  let { favoriteBooks, moodPrompt = '' } = parsed.data;

  // Auto-populate from DB if empty
  if (favoriteBooks.length === 0) {
    const topRated = await prisma.review.findMany({
      where: { userId, rating: { gte: 4 } },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: { book: { select: { title: true, authors: true } } },
    });

    if (topRated.length > 0) {
      favoriteBooks = topRated.map((r) => ({
        title: r.book.title,
        author: r.book.authors[0] ?? 'Unknown',
      }));
    } else {
      const recentlyRead = await prisma.shelf.findMany({
        where: { userId, type: 'READ' },
        orderBy: { finishedAt: 'desc' },
        take: 5,
        include: { book: { select: { title: true, authors: true } } },
      });
      favoriteBooks = recentlyRead.map((s) => ({
        title: s.book.title,
        author: s.book.authors[0] ?? 'Unknown',
      }));
    }
  }

  const avgPagesPerDay = await computeAvgPagesPerDay(userId);

  // Redis cache check
  const bookTitles = favoriteBooks.map((b: FavoriteBook) => b.title);
  const requestHash = computeRequestHash(bookTitles, moodPrompt, avgPagesPerDay);
  const cacheKey = `ai:rec:${requestHash}`;

  const cached = await cacheGet<AIRecommendationResponse>(cacheKey);
  if (cached) {
    res.json({ ...cached, source: 'cache' });
    return;
  }

  // Build prompt
  const bookListText =
    favoriteBooks.length > 0
      ? favoriteBooks
          .map((b: FavoriteBook) => `- "${b.title}"${b.author ? ` by ${b.author}` : ''}`)
          .join('\n')
      : 'The user has no reading history yet.';

  const systemPrompt = `You are a world-class literary advisor called "novoli AI". 
Respond in valid JSON only. Do not include markdown or prose outside the JSON object.`;

  const userPrompt = `
Analyze this reader's taste profile and recommend 5 books they will love.

READER'S FAVORITE / RECENTLY READ BOOKS:
${bookListText}

READER'S CURRENT MOOD / PREFERENCE:
${moodPrompt || 'Not specified — suggest based on reading history only'}

READER'S READING SPEED: approximately ${avgPagesPerDay} pages per day

Return a JSON object with exactly this structure:
{
  "readerPersonaSummary": "2-3 sentence characterization in second person",
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "category": "Genre/Category",
      "matchScore": 87,
      "whyItMatches": "Specific reason (2-3 sentences)",
      "estimatedReadingDays": 14
    }
  ]
}

Rules:
- matchScore must be integer 60-99
- estimatedReadingDays: typical page count / ${avgPagesPerDay}
- Do NOT recommend books already in the reader's list
- Provide EXACTLY 5 recommendations
`;

  if (!openai) {
    res.status(503).json({ error: 'AI recommendation service is not configured (missing OPENAI_API_KEY).' });
    return;
  }

  let aiData: Pick<AIRecommendationResponse, 'readerPersonaSummary' | 'recommendations'>;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) throw new Error('OpenAI returned empty content');

    const parsedAI = JSON.parse(rawContent) as {
      readerPersonaSummary?: string;
      recommendations?: BookRecommendation[];
    };

    if (
      typeof parsedAI.readerPersonaSummary !== 'string' ||
      !Array.isArray(parsedAI.recommendations) ||
      parsedAI.recommendations.length === 0
    ) {
      throw new Error('Invalid OpenAI response structure');
    }

    const recommendations: BookRecommendation[] = parsedAI.recommendations
      .slice(0, 5)
      .map((r: BookRecommendation) => ({
        title: String(r.title ?? ''),
        author: String(r.author ?? ''),
        category: String(r.category ?? ''),
        matchScore: Math.min(99, Math.max(0, Math.round(Number(r.matchScore) || 75))),
        whyItMatches: String(r.whyItMatches ?? ''),
        estimatedReadingDays: Math.max(1, Math.round(Number(r.estimatedReadingDays) || 14)),
      }));

    aiData = { readerPersonaSummary: parsedAI.readerPersonaSummary, recommendations };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AI] OpenAI API error:', errorMessage);

    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      res.status(429).json({ error: 'AI service is temporarily busy. Please try again shortly.' });
      return;
    }

    res.status(502).json({
      error: 'AI recommendation service unavailable',
      details: ENV.NODE_ENV === 'development' ? errorMessage : undefined,
    });
    return;
  }

  const response: AIRecommendationResponse = {
    ...aiData,
    source: 'openai',
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, response, AI_CACHE_TTL);
  res.json(response);
}
