import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import {
  listBooks,
  getBook,
  getBookReviews,
  createBookReview,
  createBook,
  updateBook,
  deleteBook,
} from './books.controller';

export const booksRouter = Router();

booksRouter.get('/', listBooks);
booksRouter.get('/:id', getBook);
booksRouter.get('/:id/reviews', getBookReviews);
booksRouter.post('/:id/reviews', authenticate, createBookReview);

// Chỉ admin (kiểm tra trong controller)
booksRouter.post('/', authenticate, createBook);
booksRouter.put('/:id', authenticate, updateBook);
booksRouter.delete('/:id', authenticate, deleteBook);
