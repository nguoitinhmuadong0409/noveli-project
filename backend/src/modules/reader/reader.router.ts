import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { streamBookFile, getState, getSummary, reportProgress } from './reader.controller';

type Handler = (req: Request, res: Response) => Promise<void>;

// Bắt lỗi bất đồng bộ để không làm sập máy chủ.
const wrap =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

export const readerRouter = Router();

readerRouter.get('/summary', authenticate, wrap(getSummary));
readerRouter.post('/progress', authenticate, wrap(reportProgress));
readerRouter.get('/:bookId/state', authenticate, wrap(getState));
readerRouter.get('/:bookId/file', authenticate, wrap(streamBookFile));
