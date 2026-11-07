import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  createThread,
  getThread,
  listThreads,
  createPost,
  getThreadPosts,
} from './forum.controller';

export const forumRouter = Router();

// Public (no auth required — anonymous by design)
forumRouter.get('/threads', listThreads);
forumRouter.get('/threads/:threadId', getThread);
forumRouter.get('/threads/:threadId/posts', getThreadPosts);

// Requires auth (user identity needed to compute HMAC, but never stored)
forumRouter.post('/threads', authenticate, createThread);
forumRouter.post('/posts', authenticate, createPost);
