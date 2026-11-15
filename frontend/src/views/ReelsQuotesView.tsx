import React, { useState } from 'react';
import { Heart, MessageCircle, BookOpen } from 'lucide-react';
import { Book, FeedPost } from '../types';
import { api } from '../services/api';
import { getBookCover } from '../utils/bookCover';

interface ReelsQuotesViewProps {
  posts: FeedPost[];
  onSelectBook?: (book: Book) => void;
  onPostUpdate?: (postId: string, patch: Partial<FeedPost>) => void;
}

// Trang Trích dẫn: tự lấy các bài đăng ở trang chủ, hiện nội dung bài đăng như một câu trích.
export const ReelsQuotesView: React.FC<ReelsQuotesViewProps> = ({ posts, onPostUpdate }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleLike = async (post: FeedPost) => {
    if (busyId) return;
    setBusyId(post.id);
    const nextLiked = !post.isLiked;
    onPostUpdate?.(post.id, {
      isLiked: nextLiked,
      likesCount: post.likesCount + (nextLiked ? 1 : -1),
    });
    try {
      const res = await api.toggleFeedLike(post.id);
      onPostUpdate?.(post.id, { isLiked: res.liked, likesCount: res.likesCount });
    } catch {
      onPostUpdate?.(post.id, { isLiked: post.isLiked, likesCount: post.likesCount });
    } finally {
      setBusyId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '80px 16px' }}>
        <div style={{ textAlign: 'center', color: 'var(--ig-text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6 }}>
            Chưa có trích dẫn nào
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Những bài đăng ở trang chủ sẽ tự động hiện ở đây như các câu trích dẫn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '16px 12px 80px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {posts.map((post) => {
          const authors = post.book.authors?.join(', ');
          const isLong = post.caption.length > 200;

          return (
            <div
              key={post.id}
              style={{
                position: 'relative',
                width: '100%',
                height: '75vh',
                maxHeight: 680,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: '#111',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              }}
            >
              <img
                src={post.image || getBookCover(post.book)}
                alt={post.book.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)',
                }}
              />

              {/* Thẻ sách + trang */}
              <div style={{ position: 'absolute', top: 18, left: 18, right: 18 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: '100%',
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--amber-400)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <BookOpen size={13} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.book.title}
                    {post.currentPage ? ` • Trang ${post.currentPage}` : ''}
                  </span>
                </div>
              </div>

              {/* Nội dung bài đăng hiện như câu trích */}
              <div
                style={{
                  position: 'absolute',
                  inset: '80px 60px 90px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <blockquote
                  style={{
                    fontFamily: 'serif',
                    fontSize: isLong ? 17 : 21,
                    fontStyle: 'italic',
                    color: '#ffffff',
                    lineHeight: 1.6,
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    marginBottom: 16,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowY: 'auto',
                  }}
                >
                  “{post.caption}”
                </blockquote>
                {authors && (
                  <div style={{ fontSize: 13, color: 'var(--amber-400)', fontWeight: 700 }}>— {authors}</div>
                )}
              </div>

              {/* Người đăng */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 18,
                  left: 20,
                  right: 70,
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: 12,
                }}
              >
                Đăng bởi <strong>@{post.author.biDanh}</strong> • {post.createdAt}
              </div>

              {/* Cột nút bên phải: thích và số bình luận (số thật) */}
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  zIndex: 10,
                }}
              >
                <button
                  onClick={() => void toggleLike(post)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: post.isLiked ? 'var(--ig-heart-red)' : '#ffffff',
                    cursor: 'pointer',
                  }}
                  title="Thích"
                >
                  <Heart size={28} fill={post.isLiked ? 'var(--ig-heart-red)' : 'none'} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{post.likesCount}</span>
                </button>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: '#ffffff',
                  }}
                  title="Số bình luận"
                >
                  <MessageCircle size={28} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{post.comments.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
