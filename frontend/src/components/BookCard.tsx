import React, { useState } from 'react';
import { Book, ShelfType } from '../types';
import { Star, Plus, Check } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onAddToShelf?: (book: Book, type: ShelfType) => void;
  currentShelfType?: ShelfType;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onAddToShelf,
  currentShelfType,
}) => {
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fallbackCover =
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80';

  const formatRating = (rating: number | string) => {
    const num = Number(rating);
    return isNaN(num) || num === 0 ? 'Mới' : num.toFixed(1);
  };

  const shelfLabels: Record<ShelfType, string> = {
    WANT_TO_READ: 'Muốn đọc',
    CURRENTLY_READING: 'Đang đọc',
    READ: 'Đã đọc xong',
    DID_NOT_FINISH: 'Tạm dừng',
    CUSTOM: 'Tùy chọn',
  };

  return (
    <div
      className="card card-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 14,
        position: 'relative',
        cursor: 'pointer',
        background: 'var(--bg-surface)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
      onClick={() => onSelect(book)}
    >
      {/* Cover Aspect Ratio Wrapper */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '145%', // ~ 1:1.45 standard book aspect ratio
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface-elevated)',
          boxShadow: '0 8px 16px -4px rgba(0,0,0,0.4)',
        }}
      >
        <img
          src={!imgError && book.coverUrl ? book.coverUrl : fallbackCover}
          alt={book.title}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform var(--transition-normal)',
          }}
          className="book-cover-img"
        />

        {/* Top Badges: Rating */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'rgba(11, 15, 23, 0.82)',
            backdropFilter: 'blur(8px)',
            color: 'var(--amber-400)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Star size={12} fill="var(--amber-400)" />
          {formatRating(book.avgRating)}
        </div>

        {/* Current Shelf status pill if already on shelf */}
        {currentShelfType && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              padding: '4px 8px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Check size={12} strokeWidth={3} />
            {shelfLabels[currentShelfType]}
          </div>
        )}
      </div>

      {/* Book Info */}
      <div style={{ marginTop: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4
          style={{
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 38,
          }}
          title={book.title}
        >
          {book.title}
        </h4>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {book.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Tác giả khuyết danh'}
        </p>

        {/* Quick Shelf Action button */}
        {onAddToShelf && (
          <div style={{ marginTop: 10, position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '6px 8px',
                fontSize: 12,
              }}
            >
              <Plus size={13} />
              {currentShelfType ? 'Đổi kệ sách' : 'Thêm vào kệ'}
            </button>

            {/* Quick dropdown menu */}
            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 6,
                  zIndex: 20,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(['CURRENTLY_READING', 'WANT_TO_READ', 'READ'] as ShelfType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddToShelf(book, type);
                      setShowMenu(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: currentShelfType === type ? 'var(--amber-400)' : 'var(--text-primary)',
                      background: currentShelfType === type ? 'var(--amber-glow)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {shelfLabels[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .book-cover-img:hover {
          transform: scale(1.04);
        }
      `}</style>
    </div>
  );
};
