import React, { useState, useEffect } from 'react';
import { Book, FeedPost } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Send } from 'lucide-react';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: (post: FeedPost) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string>('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aestheticPresets = [
    { label: 'Cà phê & Trang sách', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' },
    { label: 'Góc đọc bên cửa sổ', url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800' },
    { label: 'Tối muộn yên bình', url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800' },
    { label: 'Trà nóng & Sách cũ', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800' },
    { label: 'Thư viện cổ điển', url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800' },
  ];

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await api.getBooks({ limit: 50 });
        setBooks(res.books || []);
        if (res.books && res.books.length > 0) {
          setSelectedBookId(res.books[0].id);
        }
      } catch (err) {
        console.error('Failed to load books for post:', err);
      } finally {
        setLoadingBooks(false);
      }
    }
    loadBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !caption.trim() || !selectedBookId || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createFeedPost({
        bookId: selectedBookId,
        caption: caption.trim(),
        image: selectedImage,
        currentPage,
      });
      onPostCreated(res.post);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Không thể đăng bài');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'var(--ig-surface)',
          border: '1px solid var(--ig-border)',
          borderRadius: 16,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--ig-border)',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ig-text)' }}>
            Tạo bài viết đọc sách mới
          </span>
          <button onClick={onClose} style={{ color: 'var(--ig-text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!user ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ig-text-secondary)', fontSize: 14 }}>
            Bạn cần đăng nhập để đăng bài.
          </div>
        ) : loadingBooks ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ig-text-secondary)', fontSize: 14 }}>
            Đang tải thư viện sách...
          </div>
        ) : books.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ig-text-secondary)', fontSize: 14 }}>
            Thư viện chưa có sách nào để gắn vào bài đăng. Hãy nhờ quản trị viên thêm sách trước.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            {/* Select Book */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ig-text-secondary)', marginBottom: 6, display: 'block' }}>
                Tác phẩm bạn đang đọc:
              </label>
              <select
                className="input-field"
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} – {b.authors?.join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Page */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ig-text-secondary)', marginBottom: 6, display: 'block' }}>
                Tiến độ trang hiện tại:
              </label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Aesthetic Scene selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ig-text-secondary)', marginBottom: 8, display: 'block' }}>
                Chọn phông nền Bookstagram:
              </label>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                {aestheticPresets.map((preset) => {
                  const isSelected = selectedImage === preset.url;
                  return (
                    <div
                      key={preset.label}
                      onClick={() => setSelectedImage(preset.url)}
                      style={{
                        width: 80,
                        flexShrink: 0,
                        cursor: 'pointer',
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: isSelected ? '2px solid var(--ig-primary-blue)' : '2px solid transparent',
                      }}
                    >
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 60, objectFit: 'cover' }} />
                      <div style={{ fontSize: 10, color: 'var(--ig-text-secondary)', textAlign: 'center', marginTop: 2 }}>
                        {preset.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ig-text-secondary)', marginBottom: 6, display: 'block' }}>
                Cảm nghĩ / Trích dẫn / Hashtags:
              </label>
              <textarea
                rows={4}
                placeholder="Chia sẻ cảm xúc hoặc trích dẫn ấn tượng bạn vừa đọc được... #novoli #Reading #SachHay"
                className="input-field"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                required
              />
            </div>

            {error && (
              <div role="alert" style={{ marginBottom: 12, fontSize: 13, color: '#b91c1c' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!caption.trim() || submitting}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Send size={16} /> {submitting ? 'Đang đăng...' : 'Chia sẻ lên Bảng tin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
