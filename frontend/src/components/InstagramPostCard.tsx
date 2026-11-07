import React, { useState } from 'react';
import { FeedPost, Book, ShelfType } from '../types';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Star,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface InstagramPostCardProps {
  post: FeedPost;
  onSelectBook: (book: Book) => void;
  onSaveToShelf: (book: Book, type: ShelfType) => void;
  isSavedOnShelf?: boolean;
}

export const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
  post,
  onSelectBook,
  onSaveToShelf,
  isSavedOnShelf,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [saved, setSaved] = useState(isSavedOnShelf ?? post.isSaved);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [showAllComments, setShowAllComments] = useState(false);

  // Double tap to like
  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleToggleSave = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    onSaveToShelf(post.book, nextSaved ? 'WANT_TO_READ' : 'WANT_TO_READ');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: String(Date.now()),
      author: 'ban_doc',
      content: commentText.trim(),
      createdAt: 'Vừa xong',
    };

    setComments((prev) => [...prev, newComment]);
    setCommentText('');
  };

  const addEmoji = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

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
                {post.currentPage && ` • Trang ${post.currentPage}`}
              </div>
            )}
          </div>
        </div>

        <button style={{ color: 'var(--ig-text-secondary)', cursor: 'pointer', padding: 4 }}>
          <MoreHorizontal size={18} />
        </button>
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

        {/* Book Rating Floating Badge */}
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
          {Number(post.book.avgRating) > 0 ? Number(post.book.avgRating).toFixed(1) : '4.8'}
        </div>

        {/* Progress Pill if currently reading */}
        {post.currentPage && post.pageCount && (
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
            {Math.round((post.currentPage / post.pageCount) * 100)}% Hoàn thành
          </div>
        )}
      </div>

      {/* ─── 3. Action Buttons ──────────────────────────────── */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Like */}
            <button
              onClick={toggleLike}
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
              onClick={() => setShowAllComments(true)}
              style={{ cursor: 'pointer', color: 'var(--ig-text)' }}
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

        {/* Comments Count & List Preview */}
        {comments.length > 0 && (
          <div>
            {comments.length > 2 && !showAllComments && (
              <div
                onClick={() => setShowAllComments(true)}
                style={{ fontSize: 13, color: 'var(--ig-text-muted)', cursor: 'pointer', marginBottom: 4 }}
              >
                Xem tất cả {comments.length} bình luận
              </div>
            )}

            {(showAllComments ? comments : comments.slice(0, 2)).map((c) => (
              <div key={c.id} style={{ fontSize: 13, color: 'var(--ig-text)', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, marginRight: 6 }}>{c.author}</span>
                <span>{c.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 4. Quick Comment Bar ────────────────────────────── */}
      <form
        onSubmit={handleAddComment}
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
