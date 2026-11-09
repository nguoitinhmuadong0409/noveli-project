import React, { useState, useEffect } from 'react';
import { Book, ShelfType } from '../types';
import { api } from '../services/api';
import { BookCard } from '../components/BookCard';
import { Search, Flame, Sparkles, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DiscoverViewProps {
  onSelectBook: (book: Book) => void;
  onOpenLogModal: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onSelectBook, onOpenLogModal }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [userShelves, setUserShelves] = useState<Record<string, ShelfType>>({});

  const categories = [
    'Tất cả',
    'Tiểu thuyết',
    'Kinh điển',
    'Self-help',
    'Tâm lý học',
    'Lịch sử',
    'Văn học Việt Nam',
  ];

  // Load books & user shelves
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [booksRes, shelvesRes] = await Promise.all([
          api.getBooks({
            category: selectedCategory === 'Tất cả' ? undefined : selectedCategory,
          }),
          api.getUserShelves().catch(() => ({ shelves: [] })),
        ]);

        setBooks(booksRes.books || []);

        const shelfMap: Record<string, ShelfType> = {};
        if (shelvesRes.shelves) {
          shelvesRes.shelves.forEach((s) => {
            shelfMap[s.bookId] = s.type;
          });
        }
        setUserShelves(shelfMap);
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory]);

  // Handle Search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const localRes = await api.getBooks({ search: searchQuery.trim() });
      setBooks(localRes.books || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddToShelf = async (book: Book, type: ShelfType) => {
    try {
      await api.upsertShelf(book.id, type);
      setUserShelves((prev) => ({ ...prev, [book.id]: type }));
    } catch (err) {
      alert((err as Error).message || 'Không thể thêm vào kệ sách');
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Hero Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '36px 30px',
          borderRadius: 24,
          background: 'radial-gradient(ellipse at top right, rgba(245, 158, 11, 0.15), var(--bg-surface) 70%)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--amber-400)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={13} />
            Mạng xã hội đọc sách Privacy-First
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}
          >
            Đắm chìm trong trang sách, <br />
            <span
              style={{
                background: 'linear-gradient(to right, var(--amber-400), #f43f5e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              bảo toàn trọn vẹn riêng tư.
            </span>
          </h1>

          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            Khám phá hàng ngàn tựa sách tinh hoa, tham gia diễn đàn thảo luận ẩn danh tuyệt đối và giữ vững chuỗi đọc cùng trợ lý AI.
          </p>

          {/* Quick Streak Call to Action */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={onOpenLogModal} className="btn btn-primary btn-sm">
                <Flame size={15} /> Ghi nhận trang sách hôm nay
              </button>
              <span style={{ fontSize: 13, color: 'var(--amber-400)', fontWeight: 600 }}>
                Chuỗi hiện tại: {user.currentStreak} ngày liên tiếp 🔥
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Tìm theo tên tác phẩm, tác giả hoặc ISBN (Hỗ trợ tìm kiếm từ Google Books)..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 46,
              paddingRight: 110,
              height: 50,
              borderRadius: 16,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={searching}
            className="btn btn-primary btn-sm"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              height: 36,
            }}
          >
            {searching ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
      </form>

      {/* Category Pills */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 24,
          scrollbarWidth: 'none',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13, marginRight: 6 }}>
          <Filter size={14} /> Thể loại:
        </span>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSearchQuery('');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                background: isSelected ? 'var(--amber-500)' : 'var(--bg-surface)',
                color: isSelected ? '#0b0f17' : 'var(--text-secondary)',
                border: isSelected ? '1px solid var(--amber-500)' : '1px solid var(--border-subtle)',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Books Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải kho sách novoli...
        </div>
      ) : books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Không tìm thấy cuốn sách nào phù hợp.</p>
          <button
            onClick={() => { setSelectedCategory('Tất cả'); setSearchQuery(''); }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 12 }}
          >
            Xem toàn bộ sách
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 20,
          }}
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onAddToShelf={handleAddToShelf}
              currentShelfType={userShelves[book.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};
