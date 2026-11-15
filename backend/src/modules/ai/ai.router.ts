import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { chat } from './aiChat.controller';

type Handler = (req: Request, res: Response) => Promise<void>;

// Bắt lỗi bất đồng bộ để không làm sập máy chủ.
const wrap =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

export const aiChatRouter = Router();

aiChatRouter.post('/', authenticate, wrap(chat));
