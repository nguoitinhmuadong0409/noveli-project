import React, { useRef, useState } from 'react';
import { FeedPost, FeedComment, Book, ShelfType } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Trash2,
  Star,
  BookOpen,
} from 'lucide-react';

interface InstagramPostCardProps {
  post: FeedPost;
  onSelectBook: (book: Book) => void;
  onSaveToShelf: (book: Book, type: ShelfType) => void;
  isSavedOnShelf?: boolean;
  onDeleted?: (postId: string) => void;
}

export const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
  post,
  onSelectBook,
  onSaveToShelf,
  isSavedOnShelf,
  onDeleted,
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [saved, setSaved] = useState(isSavedOnShelf ?? post.isSaved);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<FeedComment[]>(post.comments || []);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const [removed, setRemoved] = useState(false);

  const canDelete = !!user && (user.id === post.author.id || user.role === 'admin');

  const toggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await api.toggleFeedLike(post.id);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  // Chạm đúp để thích (không bỏ thích)
  const handleDoubleTap = () => {
    if (!isLiked) {
      void toggleLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  const handleToggleSave = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    if (nextSaved) {
      onSaveToShelf(post.book, 'WANT_TO_READ');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentError(null);
    try {
      const res = await api.addFeedComment(post.id, text);
      setComments((prev) => [...prev, res.comment]);
      setCommentText('');
      setShowAllComments(true); // mở danh sách để thấy ngay bình luận vừa gửi
    } catch (err) {
      setCommentError((err as Error).message || 'Không thể gửi bình luận');
    }
  };

  // Bấm biểu tượng bình luận: mở/đóng danh sách và đưa con trỏ vào ô nhập.
  const handleCommentIcon = () => {
    setShowAllComments((prev) => !prev);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const handleDelete = async () => {
    if (!window.confirm('Xóa bài đăng này?')) return;
    try {
      await api.deleteFeedPost(post.id);
      setRemoved(true);
      onDeleted?.(post.id);
    } catch (err) {
      alert((err as Error).message || 'Không thể xóa bài đăng');
    }
  };

  const addEmoji = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  if (removed) return null;

  const rating = Number(post.book.avgRating);

  return (
    <article
      style={{
        backgroundColor: 'var(--ig-surface)',
        border: '1px solid var(--ig-border)',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        maxWidth: 580,
        width: '100%',
        margin: '0 auto 20px',
      }}
    >
      {/* ─── 1. Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="story-ring-active">
            <div className="story-avatar-inner" style={{ width: 36, height: 36 }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--ig-elevated)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--ig-text)',
                }}
              >
                {post.author.biDanh[0].toUpperCase()}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
                {post.author.biDanh}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ig-text-muted)' }}>• {post.createdAt}</span>
            </div>
            {post.book && (
              <div
                onClick={() => onSelectBook(post.book)}
                style={{
                  fontSize: 11,
                  color: 'var(--amber-400)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                }}
              >
                <BookOpen size={11} /> {post.book.title}
                {post.currentPage ? ` • Trang ${post.currentPage}` : ''}
              </div>
            )}
          </div>
        </div>

        {canDelete && (
          <button
            onClick={() => void handleDelete()}
            title="Xóa bài đăng"
            aria-label="Xóa bài đăng"
            style={{ color: 'var(--ig-text-secondary)', cursor: 'pointer', padding: 4 }}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* ─── 2. Photo / Book Media (with Double Tap Like) ───── */}
      <div
        onDoubleClick={handleDoubleTap}
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%', // 1:1 Instagram Square
          backgroundColor: '#0a0a0a',
          cursor: 'pointer',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <img
          src={post.image}
          alt={post.book.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Floating Double Tap Heart */}
        {showHeartBurst && (
          <div className="double-tap-heart">
            <Heart size={90} fill="#ff3040" color="#ff3040" />
          </div>
        )}

        {/* Điểm đánh giá thật của sách (ẩn khi chưa có ai đánh giá) */}
        {rating > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              color: 'var(--amber-400)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Star size={13} fill="var(--amber-400)" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* Tiến độ đọc */}
        {post.currentPage && post.pageCount ? (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              padding: '5px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {Math.min(100, Math.round((post.currentPage / post.pageCount) * 100))}% Hoàn thành
          </div>
        ) : null}
      </div>

      {/* ─── 3. Action Buttons ──────────────────────────────── */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Like */}
            <button
              onClick={() => void toggleLike()}
              style={{
                cursor: 'pointer',
                color: isLiked ? 'var(--ig-heart-red)' : 'var(--ig-text)',
                transition: 'transform 100ms ease',
              }}
            >
              <Heart size={24} fill={isLiked ? 'var(--ig-heart-red)' : 'none'} strokeWidth={1.8} />
            </button>

            {/* Comment */}
            <button
              onClick={handleCommentIcon}
              style={{ cursor: 'pointer', color: 'var(--ig-text)' }}
              title="Bình luận"
            >
              <MessageCircle size={24} strokeWidth={1.8} />
            </button>

            {/* Share / Discuss */}
            <button style={{ cursor: 'pointer', color: 'var(--ig-text)' }}>
              <Send size={22} strokeWidth={1.8} />
            </button>
          </div>

          {/* Bookmark to Shelf */}
          <button
            onClick={handleToggleSave}
            style={{
              cursor: 'pointer',
              color: saved ? 'var(--amber-400)' : 'var(--ig-text)',
            }}
            title={saved ? 'Đã lưu trên kệ sách' : 'Lưu vào kệ sách'}
          >
            <Bookmark size={24} fill={saved ? 'var(--amber-400)' : 'none'} strokeWidth={1.8} />
          </button>
        </div>

        {/* Likes Count */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6 }}>
          {likesCount} lượt thích
        </div>

        {/* Caption */}
        <div style={{ fontSize: 14, color: 'var(--ig-text)', lineHeight: 1.5, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, marginRight: 6 }}>{post.author.biDanh}</span>
          <span>{post.caption}</span>
        </div>

        {/* Danh sách bình luận */}
        {comments.length > 0 ? (
          <div>
            {comments.length > 2 && !showAllComments && (
              <div
                onClick={() => setShowAllComments(true)}
                style={{ fontSize: 13, color: 'var(--ig-text-muted)', cursor: 'pointer', marginBottom: 4 }}
              >
                Xem tất cả {comments.length} bình luận
              </div>
            )}

            {(showAllComments ? comments : comments.slice(-2)).map((c) => (
              <div key={c.id} style={{ fontSize: 13, color: 'var(--ig-text)', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, marginRight: 6 }}>{c.author}</span>
                <span>{c.content}</span>
              </div>
            ))}
          </div>
        ) : (
          showAllComments && (
            <div style={{ fontSize: 13, color: 'var(--ig-text-muted)' }}>
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </div>
          )
        )}
        {commentError && (
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{commentError}</div>
        )}
      </div>

      {/* ─── 4. Quick Comment Bar ────────────────────────────── */}
      <form
        onSubmit={(e) => void handleAddComment(e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderTop: '1px solid var(--ig-border-subtle)',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {['❤️', '📚', '🔥', '☕'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              style={{ fontSize: 15, cursor: 'pointer' }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <input
          ref={commentInputRef}
          type="text"
          placeholder="Thêm bình luận..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          style={{
            flex: 1,
            fontSize: 13,
            color: 'var(--ig-text)',
            padding: '4px 8px',
          }}
        />

        {commentText.trim() && (
          <button
            type="submit"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ig-primary-blue)',
              cursor: 'pointer',
            }}
          >
            Đăng
          </button>
        )}
      </form>
    </article>
  );
};
