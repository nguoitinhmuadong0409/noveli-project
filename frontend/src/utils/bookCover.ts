import { Book } from '../types';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';

export function getBookCover(book: Pick<Book, 'coverUrl' | 'driveFileId'>): string {
  if (book.coverUrl) return book.coverUrl;
  if (book.driveFileId) return `https://drive.google.com/thumbnail?id=${book.driveFileId}&sz=w500`;
  return FALLBACK_COVER;
}
