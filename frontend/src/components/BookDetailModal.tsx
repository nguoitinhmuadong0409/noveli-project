import React, { useState, useEffect } from 'react';
import { Book, ShelfType, Review } from '../types';
import { api } from '../services/api';
import { X, Star, BookOpen, Bookmark, Check, AlertTriangle, ShieldCheck, Send } from 'lucide-react';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
  onShelfChange?: (book: Book, type: ShelfType) => void;
  currentShelfType?: ShelfType;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onShelfChange,
  currentShelfType,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await api.getBookReviews(book.id);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoadingReviews(false);
      }
    }
    loadReviews();
  }, [book.id]);

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewContent.trim() || submittingReview) return;

    setSubmittingReview(true);
    try {
      const res = await api.addReview(book.id, {
        rating,
        content: reviewContent.trim(),
        hasSpoilers,
        isAnonymous,
        anonymousAlias: isAnonymous ? `Độc Giả Giấu Mặt #${Math.floor(100 + Math.random() * 900)}` : undefined,
      });

      setReviews((prev) => [res.review, ...prev]);
      setReviewContent('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      alert((err as Error).message || 'Không thể gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(5, 8, 15, 0.8)',
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
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          padding: 28,
          borderRadius: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            padding: 8,
            borderRadius: 12,
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Top Info Layout */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Cover */}
          <div
            style={{
              width: 140,
              flexShrink: 0,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--bg-surface-elevated)',
            }}
          >
            <img
              src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'}
              alt={book.title}
              style={{ width: '100%', height: 210, objectFit: 'cover' }}
            />
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {book.categories?.map((cat) => (
                <span key={cat} className="badge badge-indigo">
                  {cat}
                </span>
              ))}
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {book.title}
            </h2>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              Tác giả: <strong>{book.authors?.join(', ') || 'Chưa cập nhật'}</strong>
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--amber-400)', fontWeight: 700 }}>
                <Star size={16} fill="var(--amber-400)" />
                {Number(book.avgRating) > 0 ? Number(book.avgRating).toFixed(1) : 'Chưa có điểm'}
              </div>
              {book.pageCount && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 13 }}>
                  <BookOpen size={14} /> {book.pageCount} trang
                </div>
              )}
            </div>

            {/* Shelf Actions */}
            {onShelfChange && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Kệ sách của bạn
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { type: 'CURRENTLY_READING' as ShelfType, label: 'Đang đọc' },
                    { type: 'WANT_TO_READ' as ShelfType, label: 'Muốn đọc' },
                    { type: 'READ' as ShelfType, label: 'Đã đọc' },
                  ].map((s) => {
                    const isSelected = currentShelfType === s.type;
                    return (
                      <button
                        key={s.type}
                        onClick={() => onShelfChange(book, s.type)}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {isSelected ? <Check size={14} /> : <Bookmark size={14} />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Giới thiệu tác phẩm</h4>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {book.description || 'Chưa có thông tin tóm tắt cho cuốn sách này.'}
          </p>
        </div>

        {/* Review Submission Form */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Đánh giá & Cảm nhận</h4>

          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Rating Stars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Điểm đánh giá:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ cursor: 'pointer', color: star <= rating ? 'var(--amber-400)' : 'var(--text-muted)' }}
                  >
                    <Star size={20} fill={star <= rating ? 'var(--amber-400)' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Review text */}
            <textarea
              className="input-field"
              rows={3}
              placeholder="Chia sẻ góc nhìn sâu sắc của bạn về cuốn sách này..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              required
            />

            {/* Checkboxes: Spoiler & Anonymous */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--rose-400)' }}>
                <input
                  type="checkbox"
                  checked={hasSpoilers}
                  onChange={(e) => setHasSpoilers(e.target.checked)}
                />
                <AlertTriangle size={14} /> Có tiết lộ nội dung (Spoiler)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--emerald-400)' }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <ShieldCheck size={14} /> Đăng ẩn danh (Bảo vệ danh tính)
              </label>

              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="submit"
                  disabled={submittingReview || !reviewContent.trim()}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} />
                  {submittingReview ? 'Đang gửi...' : 'Gửi cảm nhận'}
                </button>
              </div>
            </div>

            {reviewSuccess && (
              <div style={{ color: 'var(--emerald-400)', fontSize: 13, fontWeight: 600 }}>
                ✓ Đã ghi nhận đánh giá của bạn!
              </div>
            )}
          </form>
        </div>

        {/* Reviews List */}
        <div style={{ marginTop: 24 }}>
          {loadingReviews ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải đánh giá...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reviews.map((r) => {
                const isRevealed = revealedSpoilers[r.id];
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: r.isAnonymous ? 'var(--emerald-400)' : 'var(--text-primary)' }}>
                          {r.isAnonymous ? (
                            <>
                              <ShieldCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                              {r.authorName || 'Độc giả ẩn danh'}
                            </>
                          ) : (
                            `@${r.authorName || 'nguoi_dung'}`
                          )}
                        </span>
                        <div style={{ display: 'flex', color: 'var(--amber-400)' }}>
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} size={11} fill="var(--amber-400)" />
                          ))}
                        </div>
                      </div>
                      {r.hasSpoilers && (
                        <span className="badge badge-rose" style={{ fontSize: 11 }}>
                          Spoiler
                        </span>
                      )}
                    </div>

                    {/* Content with Spoiler Blur handling */}
                    {r.hasSpoilers && !isRevealed ? (
                      <div
                        onClick={() => toggleSpoiler(r.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'rgba(244, 63, 94, 0.08)',
                          border: '1px dashed rgba(244, 63, 94, 0.3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--rose-400)',
                          fontSize: 13,
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>Cảnh báo tiết lộ nội dung — Nhấp để mở khóa đọc</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {r.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
