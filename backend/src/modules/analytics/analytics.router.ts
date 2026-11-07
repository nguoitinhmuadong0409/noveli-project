import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { getDashboard, getReadingChart } from './analytics.controller';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.get('/dashboard', getDashboard);
analyticsRouter.get('/reading-chart', getReadingChart);
