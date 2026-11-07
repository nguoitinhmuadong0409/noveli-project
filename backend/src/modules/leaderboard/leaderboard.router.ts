import { Router } from 'express';
import { getLeaderboard } from './leaderboard.controller';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', getLeaderboard);
