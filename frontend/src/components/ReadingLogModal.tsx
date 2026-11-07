import React, { useState, useEffect } from 'react';
import { ShelfItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { X, Flame, Clock, BookOpen, Check } from 'lucide-react';

interface ReadingLogModalProps {
  onClose: () => void;
  onLogSaved?: () => void;
}

export const ReadingLogModal: React.FC<ReadingLogModalProps> = ({ onClose, onLogSaved }) => {
  const { user, updateUserStreak } = useAuth();
  const [shelves, setShelves] = useState<ShelfItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [startPage, setStartPage] = useState<number>(0);
  const [endPage, setEndPage] = useState<number>(30);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBooks() {
      try {
        const data = await api.getUserShelves('CURRENTLY_READING');
        setShelves(data.shelves || []);
        if (data.shelves && data.shelves.length > 0) {
          const first = data.shelves[0];
          setSelectedBookId(first.bookId);
          setStartPage(first.currentPage);
          setEndPage(first.currentPage + 20);
        }
      } catch (err) {
        console.error('Failed to load currently reading books:', err);
      }
    }
    loadBooks();
  }, []);

  const handleBookChange = (bookId: string) => {
    setSelectedBookId(bookId);
    const item = shelves.find((s) => s.bookId === bookId);
    if (item) {
      setStartPage(item.currentPage);
      setEndPage(item.currentPage + 20);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || submitting) return;

    setSubmitting(true);
    try {
      await api.logReadingSession({
        bookId: selectedBookId,
        startPage,
        endPage,
        durationMinutes,
        note: note.trim() || undefined,
      });

      // Update progress on shelf as well
      await api.updateProgress(selectedBookId, endPage);

      // Increase streak visually
      if (user) {
        updateUserStreak(user.currentStreak + 1);
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#fbbf24', '#10b981'],
      });

      if (onLogSaved) onLogSaved();
      onClose();
    } catch (err) {
      alert((err as Error).message || 'Không thể lưu phiên đọc');
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
        backgroundColor: 'rgba(5, 8, 15, 0.82)',
        backdropFilter: 'blur(10px)',
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
          maxWidth: 500,
          backgroundColor: 'var(--bg-surface)',
          padding: 26,
          borderRadius: 22,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--amber-400)',
            }}
          >
            <Flame size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Ghi Nhận Buổi Đọc Sách</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Duy trì chuỗi streak và tích lũy số trang đã đọc hôm nay
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Select Book */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Chọn cuốn sách bạn vừa đọc:
            </label>
            {shelves.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Chưa có sách nào trong mục 'Đang đọc'. Hãy thêm sách từ mục Khám phá trước.
              </p>
            ) : (
              <select
                className="input-field"
                value={selectedBookId}
                onChange={(e) => handleBookChange(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {shelves.map((s) => (
                  <option key={s.bookId} value={s.bookId}>
                    {s.book.title} (Trang hiện tại: {s.currentPage})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Start and End Page */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Từ trang:
              </label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Đến trang:
              </label>
              <input
                type="number"
                min={startPage}
                className="input-field"
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--emerald-400)', fontWeight: 600 }}>
            <BookOpen size={15} />
            Tổng số trang đọc đợt này: {Math.max(0, endPage - startPage)} trang
          </div>

          {/* Duration */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} /> Thời gian đọc (phút):
            </label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
              Ghi chú nhanh / Chiêm nghiệm (Tùy chọn):
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Đọc chương 4 rất xúc động..."
              className="input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !selectedBookId || endPage < startPage}
            className="btn btn-primary"
            style={{ marginTop: 8, justifyContent: 'center' }}
          >
            <Check size={18} />
            {submitting ? 'Đang ghi nhận...' : 'Lưu phiên đọc & Giữ streak 🔥'}
          </button>
        </form>
      </div>
    </div>
  );
};
