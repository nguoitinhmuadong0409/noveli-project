import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  listBooks,
  searchBooks,
  getBook,
  getBookReviews,
  createBookReview,
} from './books.controller';

export const booksRouter = Router();

booksRouter.get('/', listBooks);
booksRouter.get('/search', searchBooks);
booksRouter.get('/:id', getBook);
booksRouter.get('/:id/reviews', getBookReviews);
booksRouter.post('/:id/reviews', authenticate, createBookReview);
