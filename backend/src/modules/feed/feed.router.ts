import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { listPosts, createPost, deletePost, toggleLike, addComment } from './feed.controller';

export const feedRouter = Router();

feedRouter.get('/posts', authenticate, listPosts);
feedRouter.post('/posts', authenticate, createPost);
feedRouter.delete('/posts/:id', authenticate, deletePost);
feedRouter.post('/posts/:id/like', authenticate, toggleLike);
feedRouter.post('/posts/:id/comments', authenticate, addComment);
