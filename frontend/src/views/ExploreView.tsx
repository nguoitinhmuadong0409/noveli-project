import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { api } from '../services/api';
import { BookReaderModal } from '../components/BookReaderModal';
import { getBookCover } from '../utils/bookCover';
import { Search } from 'lucide-react';

interface ExploreViewProps {
  onSelectBook: (book: Book) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState('Tất cả');
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const categories = ['Tất cả', 'Tiểu thuyết', 'Kinh điển', 'Self-help', 'Tâm lý học', 'Lịch sử'];

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      try {
        const res = await api.getBooks({
          category: category === 'Tất cả' ? undefined : category,
        });
        setBooks(res.books || []);
      } catch (err) {
        console.error('Failed to load explore books:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, [category]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await api.getBooks({ search: search.trim() || undefined });
      setBooks(res.books || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ig-text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Tìm sách trong thư viện theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 42, paddingRight: 90, height: 42, borderRadius: 10 }}
          />
          <button
            type="submit"
            disabled={searching}
            className="btn btn-primary btn-sm"
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', height: 30 }}
          >
            {searching ? '...' : 'Tìm'}
          </button>
        </div>
      </form>

      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          scrollbarWidth: 'none',
          justifyContent: 'center',
        }}
      >
        {categories.map((c) => {
          const isSelected = category === c;
          return (
            <button
              key={c}
              onClick={() => { setCategory(c); setSearch(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--ig-text)' : 'var(--ig-surface)',
                color: isSelected ? 'var(--ig-bg)' : 'var(--ig-text-secondary)',
                border: isSelected ? '1px solid var(--ig-text)' : '1px solid var(--ig-border)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Book grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ig-text-muted)' }}>
          Đang tải thư viện sách...
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ig-text-secondary)' }}>
          Thư viện chưa có sách nào phù hợp.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => setReadingBook(book)}
              style={{
                position: 'relative',
                width: '100%',
                paddingTop: '130%',
                backgroundColor: 'var(--ig-surface)',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid var(--ig-border)',
              }}
              className="explore-grid-item"
            >
              <img
                src={getBookCover(book)}
                alt={book.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              <div
                className="explore-hover-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: 0,
                  transition: 'opacity var(--transition-fast)',
                  padding: 12,
                  textAlign: 'center',
                  color: '#ffffff',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{book.title}</div>
                <div style={{ fontSize: 12 }}>{book.authors?.join(', ')}</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>Bấm để đọc</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {readingBook && (
        <BookReaderModal book={readingBook} onClose={() => setReadingBook(null)} />
      )}

      <style>{`
        .explore-grid-item:hover .explore-hover-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};
