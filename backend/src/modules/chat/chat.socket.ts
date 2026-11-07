import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { ENV } from '../../config/env';

interface SocketAuthPayload {
  sub: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server | null = null;

export function attachChatSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: ENV.CORS_ORIGINS, credentials: true },
    maxHttpBufferSize: 64 * 1024,
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const authToken = socket.handshake.auth.token;
    const header = socket.handshake.headers.authorization;
    const bearerToken = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = typeof authToken === 'string' ? authToken : bearerToken;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as SocketAuthPayload;
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid access token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    await socket.join(socket.userId!);
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: socket.userId },
      select: { conversationId: true },
    });
    for (const membership of memberships) {
      await socket.join(membership.conversationId);
    }
  });
  return io;
}

export function addUsersToChatRoom(userIds: string[], conversationId: string): void {
  for (const userId of userIds) {
    io?.in(userId).socketsJoin(conversationId);
  }
}

export function publishChatMessage(message: {
  conversationId: string;
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; biDanh: string; avatarSeed: string };
}): void {
  io?.to(message.conversationId).emit('chat:message', message);
}
