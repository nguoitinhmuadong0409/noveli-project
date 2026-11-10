import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { ENV } from './config/env';
import { privacyShield } from './middlewares/privacyShield';
import { authRouter } from './modules/auth/auth.router';
import { booksRouter } from './modules/books/books.router';
import { feedRouter } from './modules/feed/feed.router';
import { shelvesRouter } from './modules/shelves/shelves.router';
import { forumRouter } from './modules/forum/forum.router';
import { aiRouter } from './modules/ai/ai.router';
import { readingLogsRouter } from './modules/reading-logs/readingLogs.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { adminRouter } from './modules/admin/admin.router';
import { leaderboardRouter } from './modules/leaderboard/leaderboard.router';
import { chatRouter } from './modules/chat/chat.router';

export function createApp() {
  const app = express();

  // ── 1. Privacy Shield — MUST be first ──────────────────────────────────────
  app.use(privacyShield);

  // ── 2. Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          frameSrc: ["'self'", "https://drive.google.com"], // Thêm dòng này để cho phép nhúng Google Drive
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── 3. CORS ────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: ENV.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── 4. Body parsing + Cookies ──────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // ── 5. Request logging (privacy-safe: no IP in logs) ──────────────────────
  morgan.token('anon-ip', () => '0.0.0.0');
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms', {
      skip: (req) => req.url === '/health',
    }),
  );

  // ── 6. Health check ────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── 7. API Routes ──────────────────────────────────────────────────────────
  const API_PREFIX = '/api/v1';

  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/books`, booksRouter);
  app.use('/api/v1/feed', feedRouter);
  app.use(`${API_PREFIX}/shelves`, shelvesRouter);
  app.use(`${API_PREFIX}/forum`, forumRouter);
  app.use(`${API_PREFIX}/ai`, aiRouter);
  app.use(`${API_PREFIX}/reading-logs`, readingLogsRouter);
  app.use(`${API_PREFIX}/analytics`, analyticsRouter);
  app.use(`${API_PREFIX}/admin`, adminRouter);
  app.use(`${API_PREFIX}/leaderboard`, leaderboardRouter);
  app.use(`${API_PREFIX}/chat`, chatRouter);

  // ── 8. Serve the built Vite app from the same origin in production ────────
  if (ENV.NODE_ENV === 'production') {
    const frontendDist = path.resolve(__dirname, '../public');
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        req.path !== '/health' &&
        req.path !== API_PREFIX &&
        !req.path.startsWith(`${API_PREFIX}/`)
      ) {
        res.sendFile(path.join(frontendDist, 'index.html'));
        return;
      }
      next();
    });
  }

  // ── 9. 404 handler ────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // ── 10. Global error handler ───────────────────────────────────────────────
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[App] Unhandled error:', message);
    res.status(500).json({
      error: 'Internal server error',
      details: ENV.NODE_ENV === 'development' ? message : undefined,
    });
  });

  return app;
}
