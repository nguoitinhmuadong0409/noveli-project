import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FeedPost, Book } from '../types';
import { ShelvesView } from './ShelvesView';
import { AnalyticsView } from './AnalyticsView';
import { Grid, Bookmark, TrendingUp, Flame, ShieldCheck, Heart, MessageCircle } from 'lucide-react';

interface ProfileViewProps {
  userPosts: FeedPost[];
  onSelectBook: (book: Book) => void;
  onNavigateDiscover: () => void;
  onOpenAuthModal: () => void;
  onOpenLogModal: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userPosts,
  onSelectBook,
  onNavigateDiscover,
  onOpenAuthModal,
  onOpenLogModal,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [profileTab, setProfileTab] = useState<'posts' | 'shelves' | 'analytics'>('posts');
  const [readCount, setReadCount] = useState(0);

  // Số cuốn đã đọc = số sách trong mục "Đã hoàn thành" của kệ sách.
  useEffect(() => {
    if (!userId) {
      setReadCount(0);
      return;
    }
    api
      .getUserShelves('READ')
      .then((res) => setReadCount((res.shelves || []).length))
      .catch(() => setReadCount(0));
  }, [userId]);

  const highlights = [
    { title: '2026 Goal', icon: '🎯' },
    { title: 'Yêu Thích', icon: '⭐' },
    { title: 'Quotes Hay', icon: '☕' },
    { title: 'Đang Đọc', icon: '📖' },
  ];

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '30px 16px 80px' }}>
      {/* ─── 1. Profile Header ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          marginBottom: 36,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div className="story-ring-active" style={{ padding: 4 }}>
          <div className="story-avatar-inner" style={{ width: 120, height: 120 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--ig-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                fontWeight: 800,
                color: 'var(--ig-text)',
              }}
            >
              {user ? user.biDanh[0].toUpperCase() : 'U'}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ig-text)' }}>
              @{user ? user.biDanh : 'nguoi_dung'}
            </h2>
            <button
              onClick={onOpenAuthModal}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              Đổi tài khoản
            </button>
            <button
              onClick={onOpenLogModal}
              className="btn btn-primary btn-sm"
              style={{ fontSize: 13 }}
            >
              <Flame size={14} /> Đọc tiếp
            </button>
          </div>

          {/* Stats Bar: số liệu thật */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 16, fontSize: 15, flexWrap: 'wrap' }}>
            <div>
              <strong>{userPosts.length}</strong>{' '}
              <span style={{ color: 'var(--ig-text-secondary)' }}>bài viết</span>
            </div>
            <div>
              <strong>{readCount}</strong>{' '}
              <span style={{ color: 'var(--ig-text-secondary)' }}>cuốn đã đọc</span>
            </div>
            <div style={{ color: 'var(--amber-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={16} fill="var(--amber-400)" />
              <strong>{user?.currentStreak ?? 0} ngày streak</strong>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={13} /> Danh tính bảo mật Zero-Tracking
          </div>
        </div>
      </div>

      {/* ─── 2. Story Highlights Tray ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          paddingBottom: 24,
          borderBottom: '1px solid var(--ig-border)',
          marginBottom: 20,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {highlights.map((h) => (
          <div
            key={h.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'var(--ig-elevated)',
                border: '1px solid var(--ig-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {h.icon}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ig-text)' }}>
              {h.title}
            </span>
          </div>
        ))}
      </div>

      {/* ─── 3. Tabs Bar ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          borderBottom: '1px solid var(--ig-border-subtle)',
          marginBottom: 24,
        }}
      >
        {[
          { id: 'posts', label: 'BÀI VIẾT', icon: Grid },
          { id: 'shelves', label: 'KỆ SÁCH', icon: Bookmark },
          { id: 'analytics', label: 'THỐNG KÊ', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = profileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id as 'posts' | 'shelves' | 'analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 4px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                color: isActive ? 'var(--ig-text)' : 'var(--ig-text-muted)',
                borderTop: isActive ? '2px solid var(--ig-text)' : '2px solid transparent',
                marginTop: -1,
                transition: 'color var(--transition-fast)',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── 4. Tab Content ──────────────────────────────────── */}
      {profileTab === 'posts' && (
        <div>
          {userPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ig-text-muted)' }}>
              Chưa có bài viết nào. Hãy chia sẻ cảm nghĩ về cuốn sách bạn vừa đọc!
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
              }}
            >
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectBook(post.book)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: 'var(--ig-surface)',
                  }}
                  className="explore-grid-item"
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
                  <div
                    className="explore-hover-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 20,
                      opacity: 0,
                      transition: 'opacity var(--transition-fast)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Heart size={18} fill="#ffffff" /> {post.likesCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageCircle size={18} fill="#ffffff" /> {post.comments.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profileTab === 'shelves' && (
        <ShelvesView
          onSelectBook={onSelectBook}
          onNavigateDiscover={onNavigateDiscover}
        />
      )}

      {profileTab === 'analytics' && (
        <AnalyticsView onOpenLogModal={onOpenLogModal} />
      )}

      <style>{`
        .explore-grid-item:hover .explore-hover-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};
