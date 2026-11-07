import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  addGroupMembers,
  createDirectConversation,
  createGroupConversation,
  listConversations,
  listMessages,
  sendMessage,
} from './chat.controller';

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.get('/conversations', listConversations);
chatRouter.post('/conversations/direct', createDirectConversation);
chatRouter.post('/conversations/groups', createGroupConversation);
chatRouter.post('/conversations/:conversationId/members', addGroupMembers);
chatRouter.get('/conversations/:conversationId/messages', listMessages);
chatRouter.post('/conversations/:conversationId/messages', sendMessage);
