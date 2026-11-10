import React from 'react';
import { Book } from '../types';

interface ReelsQuotesViewProps {
  onSelectBook?: (book: Book) => void;
}

export const ReelsQuotesView: React.FC<ReelsQuotesViewProps> = () => {
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '80px 16px' }}>
      <div style={{ textAlign: 'center', color: 'var(--ig-text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6 }}>
          Chưa có trích dẫn nào
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          Những câu trích từ sách người đọc chia sẻ sẽ hiện ở đây.
        </p>
      </div>
    </div>
  );
};
