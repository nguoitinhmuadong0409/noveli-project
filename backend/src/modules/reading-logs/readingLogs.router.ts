import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { syncReadingLogs, getReadingLogs } from './readingLogs.controller';

export const readingLogsRouter = Router();

readingLogsRouter.use(authenticate);
readingLogsRouter.post('/sync', syncReadingLogs);
readingLogsRouter.get('/', getReadingLogs);
