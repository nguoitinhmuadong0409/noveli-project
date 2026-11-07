import React, { useState, useEffect } from 'react';
import { ShelfItem, ShelfType, Book } from '../types';
import { api } from '../services/api';
import { ReadingProgressModal } from '../components/ReadingProgressModal';
import { BookOpen, CheckCircle, Clock, Trash2, Edit3, Compass } from 'lucide-react';

interface ShelvesViewProps {
  onSelectBook: (book: Book) => void;
  onNavigateDiscover: () => void;
}

export const ShelvesView: React.FC<ShelvesViewProps> = ({ onSelectBook, onNavigateDiscover }) => {
  const [activeTab, setActiveTab] = useState<ShelfType>('CURRENTLY_READING');
  const [shelves, setShelves] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressModalItem, setProgressModalItem] = useState<ShelfItem | null>(null);

  const tabs: { type: ShelfType; label: string; icon: React.FC<{ size?: number }> }[] = [
    { type: 'CURRENTLY_READING', label: 'Đang đọc', icon: BookOpen },
    { type: 'WANT_TO_READ', label: 'Muốn đọc', icon: Clock },
    { type: 'READ', label: 'Đã hoàn thành', icon: CheckCircle },
  ];

  const loadShelves = async () => {
    setLoading(true);
    try {
      const data = await api.getUserShelves(activeTab);
      setShelves(data.shelves || []);
    } catch (err) {
      console.error('Failed to load shelves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShelves();
  }, [activeTab]);

  const handleRemove = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa cuốn sách này khỏi kệ?')) return;
    try {
      await api.removeFromShelf(bookId);
      setShelves((prev) => prev.filter((s) => s.bookId !== bookId));
    } catch (err) {
      alert((err as Error).message || 'Không thể xóa');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Kệ Sách Của Tôi</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Theo dõi tiến độ đọc, trang sách đã lật và lưu giữ tủ sách cá nhân
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 24 }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.type;
          return (
            <button
              key={t.type}
              onClick={() => setActiveTab(t.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: isSelected ? 'var(--amber-400)' : 'var(--text-secondary)',
                border: isSelected ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Shelf Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải kệ sách...
        </div>
      ) : shelves.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            Kệ này hiện đang trống
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Chưa có cuốn sách nào trong danh mục này. Hãy tìm sách yêu thích để thêm vào!
          </p>
          <button onClick={onNavigateDiscover} className="btn btn-primary btn-sm">
            <Compass size={16} /> Khám phá sách ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {shelves.map((item) => {
            const totalPages = item.book.pageCount || 300;
            const progress = Math.min(100, Math.round((item.currentPage / totalPages) * 100));

            return (
              <div
                key={item.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  gap: 20,
                  alignItems: 'center',
                  padding: 16,
                  cursor: 'pointer',
                }}
                onClick={() => onSelectBook(item.book)}
              >
                {/* Cover */}
                <img
                  src={item.book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                  alt={item.book.title}
                  style={{ width: 64, height: 96, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />

                {/* Details & Progress */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                    {item.book.title}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {item.book.authors?.join(', ') || 'Tác giả'}
                  </p>

                  {/* Progress bar if CURRENTLY_READING */}
                  {activeTab === 'CURRENTLY_READING' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--amber-400)', fontWeight: 600, marginBottom: 4 }}>
                        <span>Đã đọc: {item.currentPage} / {totalPages} trang</span>
                        <span>{progress}%</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 9999,
                          backgroundColor: 'var(--bg-surface-elevated)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, var(--amber-500), var(--emerald-400))',
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'READ' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--emerald-400)', fontSize: 13, fontWeight: 600 }}>
                      <CheckCircle size={14} /> Hoàn thành trọn vẹn {totalPages} trang
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {activeTab === 'CURRENTLY_READING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProgressModalItem(item);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Cập nhật trang"
                    >
                      <Edit3 size={14} /> Cập nhật trang
                    </button>
                  )}
                  <button
                    onClick={(e) => handleRemove(item.bookId, e)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--text-muted)' }}
                    title="Xóa khỏi kệ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Modal */}
      {progressModalItem && (
        <ReadingProgressModal
          shelfItem={progressModalItem}
          onClose={() => setProgressModalItem(null)}
          onUpdated={() => {
            loadShelves();
            setProgressModalItem(null);
          }}
        />
      )}
    </div>
  );
};
