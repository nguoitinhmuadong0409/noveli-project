import { Request, Response } from 'express';
import { Prisma, ConversationType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { addUsersToChatRoom, publishChatMessage } from './chat.socket';

const directConversationSchema = z.object({
  biDanh: z.string().trim().min(3).max(30),
});

const groupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  members: z.array(z.string().trim().min(3).max(30)).max(49).default([]),
});

const addMembersSchema = z.object({
  members: z.array(z.string().trim().min(3).max(30)).min(1).max(49),
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  content: true,
  createdAt: true,
  sender: { select: { id: true, biDanh: true, avatarSeed: true } },
} satisfies Prisma.MessageSelect;

function isPrismaUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findMembersByNames(names: string[], excludeUserId: string) {
  const normalized = [...new Set(names.map((name) => name.toLowerCase()))];
  if (normalized.length !== names.length) return null;

  const users = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      OR: normalized.map((name) => ({ biDanh: { equals: name, mode: 'insensitive' as const } })),
    },
    select: { id: true, biDanh: true },
  });

  return users.length === normalized.length ? users : null;
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: 'desc' } },
    take: 100,
    select: {
      role: true,
      conversation: {
        select: {
          id: true,
          type: true,
          name: true,
          updatedAt: true,
          members: {
            select: { user: { select: { id: true, biDanh: true, avatarSeed: true } } },
          },
          messages: {
            take: 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: MESSAGE_SELECT,
          },
        },
      },
    },
  });

  res.json({
    conversations: memberships.map(({ role, conversation }) => {
      const otherMembers = conversation.members.map((member) => member.user).filter((member) => member.id !== userId);
      return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.type === ConversationType.GROUP ? conversation.name : otherMembers.map((member) => member.biDanh).join(', '),
        members: conversation.members.map((member) => member.user),
        memberCount: conversation.members.length,
        role,
        updatedAt: conversation.updatedAt,
        lastMessage: conversation.messages[0] ?? null,
      };
    }),
  });
}

export async function createDirectConversation(req: Request, res: Response): Promise<void> {
  const parsed = directConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const target = await prisma.user.findFirst({
    where: { biDanh: { equals: parsed.data.biDanh, mode: 'insensitive' }, id: { not: req.userId! } },
    select: { id: true },
  });
  if (!target) {
    res.status(404).json({ error: 'User not found. You cannot start a conversation with yourself.' });
    return;
  }

  const directKey = [req.userId!, target.id].sort().join(':');
  try {
    const conversation = await prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        directKey,
        members: { create: [{ userId: req.userId!, role: 'ADMIN' }, { userId: target.id }] },
      },
      select: { id: true },
    });
    res.status(201).json({ conversationId: conversation.id });
  } catch (error) {
    if (!isPrismaUniqueError(error)) throw error;
    const existing = await prisma.conversation.findUnique({
      where: { directKey },
      select: { id: true },
    });
    if (!existing) throw error;
    res.json({ conversationId: existing.id });
  }
}

export async function createGroupConversation(req: Request, res: Response): Promise<void> {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const users = await findMembersByNames(parsed.data.members, req.userId!);
  if (!users) {
    res.status(400).json({ error: 'Members must be unique registered usernames and cannot include yourself' });
    return;
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: ConversationType.GROUP,
      name: parsed.data.name,
      members: {
        create: [
          { userId: req.userId!, role: 'ADMIN' },
          ...users.map((user) => ({ userId: user.id, role: 'MEMBER' })),
        ],
      },
    },
    select: { id: true },
  });

  res.status(201).json({ conversationId: conversation.id });
}

export async function addGroupMembers(req: Request, res: Response): Promise<void> {
  const parsedConversationId = z.string().uuid().safeParse(req.params.conversationId);
  const parsed = addMembersSchema.safeParse(req.body);
  if (!parsedConversationId.success || !parsed.success) {
    res.status(400).json({ error: 'A valid conversation ID and member usernames are required' });
    return;
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: parsedConversationId.data,
      type: ConversationType.GROUP,
      members: { some: { userId: req.userId!, role: 'ADMIN' } },
    },
    select: { id: true, members: { select: { userId: true } } },
  });
  if (!conversation) {
    res.status(404).json({ error: 'Group not found or you are not a group admin' });
    return;
  }

  const users = await findMembersByNames(parsed.data.members, req.userId!);
  if (!users) {
    res.status(400).json({ error: 'Members must be unique registered usernames and cannot include yourself' });
    return;
  }

  const existingIds = new Set(conversation.members.map((member) => member.userId));
  const newUsers = users.filter((user) => !existingIds.has(user.id));
  if (!newUsers.length) {
    res.status(409).json({ error: 'All selected users are already in this group' });
    return;
  }

  await prisma.conversationMember.createMany({
    data: newUsers.map((user) => ({ conversationId: conversation.id, userId: user.id })),
  });
  addUsersToChatRoom(newUsers.map((user) => user.id), conversation.id);
  res.status(201).json({ added: newUsers.length });
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const parsedConversationId = z.string().uuid().safeParse(req.params.conversationId);
  const parsedLimit = z.coerce.number().int().min(1).max(100).default(50).safeParse(req.query.limit);
  if (!parsedConversationId.success || !parsedLimit.success) {
    res.status(400).json({ error: 'Invalid conversation ID or message limit' });
    return;
  }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: parsedConversationId.data, userId: req.userId! } },
    select: { id: true },
  });
  if (!membership) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: parsedConversationId.data },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: parsedLimit.data + 1,
    select: MESSAGE_SELECT,
  });
  const hasMore = messages.length > parsedLimit.data;
  const page = hasMore ? messages.slice(0, parsedLimit.data) : messages;
  res.json({ messages: page.reverse(), hasMore });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const parsedConversationId = z.string().uuid().safeParse(req.params.conversationId);
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsedConversationId.success || !parsed.success) {
    res.status(400).json({ error: 'Invalid conversation ID or message content' });
    return;
  }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: parsedConversationId.data, userId: req.userId! } },
    select: { id: true },
  });
  if (!membership) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: parsedConversationId.data,
        senderId: req.userId!,
        content: parsed.data.content,
      },
      select: MESSAGE_SELECT,
    });
    await tx.conversation.update({
      where: { id: parsedConversationId.data },
      data: { updatedAt: created.createdAt },
    });
    return created;
  });

  publishChatMessage(message);
  res.status(201).json({ message });
}
