import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  upsertShelf,
  getUserShelves,
  updateProgress,
  deleteShelf,
} from './shelves.controller';

export const shelvesRouter = Router();

shelvesRouter.use(authenticate);
shelvesRouter.get('/', getUserShelves);
shelvesRouter.put('/', upsertShelf);
shelvesRouter.patch('/:bookId/progress', updateProgress);
shelvesRouter.delete('/:bookId', deleteShelf);
