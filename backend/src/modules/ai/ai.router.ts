import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { aiRateLimiter } from '../../middlewares/rateLimiter';
import { getAIRecommendations } from './ai.controller';

export const aiRouter = Router();

aiRouter.post('/recommendations', authenticate, aiRateLimiter, getAIRecommendations);
