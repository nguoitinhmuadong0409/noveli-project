import { createApp } from './app';
import { connectRedis } from './config/redis';
import { prisma } from './config/prisma';
import { startPushNotificationJob } from './jobs/pushNotificationJob';
import { ENV } from './config/env';
import { createServer } from 'http';
import { attachChatSocket } from './modules/chat/chat.socket';

async function bootstrap() {
  // 1. Connect to Redis
  await connectRedis();

  // 2. Test database connection
  await prisma.$connect();
  console.log('[DB] PostgreSQL connected');

  // 3. Create and start Express server
  const app = createApp();

  const server = createServer(app);
  const chatSocket = attachChatSocket(server);
  server.listen(ENV.PORT, () => {
    console.log(`[Server] novoli API running on port ${ENV.PORT} (${ENV.NODE_ENV})`);
  });

  // 4. Start background jobs
  startPushNotificationJob();

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
    chatSocket.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
