import React, { useState } from 'react';
import { ShelfItem } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { X, CheckCircle, BookOpen, Sparkles } from 'lucide-react';

interface ReadingProgressModalProps {
  shelfItem: ShelfItem;
  onClose: () => void;
  onUpdated: (updatedItem: ShelfItem) => void;
}

export const ReadingProgressModal: React.FC<ReadingProgressModalProps> = ({
  shelfItem,
  onClose,
  onUpdated,
}) => {
  const [page, setPage] = useState<number>(shelfItem.currentPage);
  const [saving, setSaving] = useState(false);
  const totalPages = shelfItem.book.pageCount || 300;

  const progressPercent = Math.min(100, Math.round((page / totalPages) * 100));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateProgress(shelfItem.bookId, page);
      if (res.isFinished || page >= totalPages) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onUpdated({ ...shelfItem, currentPage: page, type: res.isFinished ? 'READ' : shelfItem.type });
      onClose();
    } catch (err) {
      alert((err as Error).message || 'Không thể cập nhật tiến độ');
    } finally {
      setSaving(false);
    }
  };

  const addPages = (delta: number) => {
    setPage((prev) => Math.min(totalPages, Math.max(0, prev + delta)));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(5, 8, 15, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--bg-surface)',
          padding: 24,
          borderRadius: 20,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            padding: 8,
            borderRadius: 10,
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <img
            src={shelfItem.book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200'}
            alt={shelfItem.book.title}
            style={{ width: 56, height: 80, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{shelfItem.book.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {shelfItem.book.authors?.join(', ') || 'Tác giả'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--amber-400)', marginTop: 4 }}>
              <BookOpen size={13} /> {page} / {totalPages} trang ({progressPercent}%)
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          style={{
            height: 10,
            borderRadius: 9999,
            backgroundColor: 'var(--bg-surface-elevated)',
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, var(--amber-500), var(--emerald-400))',
              borderRadius: 9999,
              transition: 'width 250ms ease-out',
            }}
          />
        </div>

        {/* Page Slider & Direct Input */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="range"
            min={0}
            max={totalPages}
            value={page}
            onChange={(e) => setPage(parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              accentColor: 'var(--amber-500)',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Quick addition shortcuts */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {[+10, +25, +50].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => addPages(delta)}
              className="btn btn-secondary btn-sm"
            >
              +{delta} trang
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--emerald-400)' }}
          >
            <Sparkles size={13} /> Đã đọc xong
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <CheckCircle size={18} />
          {saving ? 'Đang lưu...' : 'Lưu tiến độ đọc'}
        </button>
      </div>
    </div>
  );
};
