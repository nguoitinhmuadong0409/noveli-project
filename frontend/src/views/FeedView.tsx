import React, { useEffect, useState } from 'react';
import { FeedPost, Story, Book, ShelfType, LeaderboardEntry } from '../types';
import { StoriesBar } from '../components/StoriesBar';
import { InstagramPostCard } from '../components/InstagramPostCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Flame, BookOpen, ShieldCheck } from 'lucide-react';

interface FeedViewProps {
  onSelectBook: (book: Book) => void;
  onSaveToShelf: (book: Book, type: ShelfType) => void;
  onSelectStory: (story: Story) => void;
  onOpenCreatePost: () => void;
  onOpenLogModal: () => void;
  onOpenAuthModal: () => void;
  posts: FeedPost[];
}

export const FeedView: React.FC<FeedViewProps> = ({
  onSelectBook,
  onSaveToShelf,
  onSelectStory,
  onOpenCreatePost,
  onOpenLogModal,
  onOpenAuthModal,
  posts,
}) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Chưa có tính năng tin (story) lưu trên máy chủ nên để trống.
  const stories: Story[] = [];

  // Bạn đọc nổi bật tháng này: dữ liệu thật từ bảng xếp hạng.
  const [topReaders, setTopReaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!userId) {
      setTopReaders([]);
      return;
    }
    const now = new Date();
    api
      .getLeaderboard(now.getMonth() + 1, now.getFullYear())
      .then((res) => setTopReaders((res.leaderboard || []).slice(0, 5)))
      .catch(() => setTopReaders([]));
  }, [userId]);

  return (
    <div
      style={{
        maxWidth: 975,
        margin: '0 auto',
        padding: '24px 16px 80px',
        display: 'flex',
        justifyContent: 'center',
        gap: 64,
      }}
    >
      {/* ─── Center Column: Stories & Feed ───────────────────── */}
      <div style={{ maxWidth: 630, width: '100%' }}>
        <StoriesBar
          stories={stories}
          onSelectStory={onSelectStory}
          onOpenCreateStory={onOpenCreatePost}
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {posts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 20px',
                color: 'var(--ig-text-secondary)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6 }}>
                Chưa có bài đăng nào
              </h3>
              <p style={{ fontSize: 14, marginBottom: 20 }}>
                Chia sẻ cuốn sách bạn đang đọc để bài đăng đầu tiên xuất hiện ở đây.
              </p>
              <button onClick={onOpenCreatePost} className="btn btn-primary btn-sm">
                Tạo bài viết
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <InstagramPostCard
                key={post.id}
                post={post}
                onSelectBook={onSelectBook}
                onSaveToShelf={onSaveToShelf}
              />
            ))
          )}
        </div>
      </div>

      {/* ─── Right Column ─── */}
      <div
        className="ig-right-rail"
        style={{
          width: 310,
          flexShrink: 0,
          position: 'sticky',
          top: 24,
          height: 'fit-content',
        }}
      >
        {/* User Card */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--ig-story-gradient)',
                  padding: 2,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: 'var(--ig-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  {user.biDanh[0].toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ig-text)' }}>
                  {user.biDanh}
                </div>
                <div style={{ fontSize: 12, color: 'var(--amber-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} fill="var(--amber-400)" /> {user.currentStreak} ngày streak
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAuthModal}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ig-primary-blue)',
                cursor: 'pointer',
              }}
            >
              Chuyển
            </button>
          </div>
        )}

        {/* Streak widget: chỉ dùng số liệu thật của tài khoản */}
        {user && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: 'var(--ig-surface)',
              border: '1px solid var(--ig-border)',
              marginBottom: 20,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
                Chuỗi đọc của bạn
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ig-text-secondary)', marginBottom: 10 }}>
              {user.currentStreak > 0
                ? `Bạn đang đọc liên tiếp ${user.currentStreak} ngày. Đọc sách hôm nay để giữ chuỗi.`
                : 'Đọc sách hôm nay để bắt đầu chuỗi đọc.'}
            </p>
            <button
              onClick={onOpenLogModal}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            >
              <BookOpen size={13} /> Đọc tiếp
            </button>
          </div>
        )}

        {/* Bạn đọc nổi bật tháng này (dữ liệu thật) */}
        {user && (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text-muted)' }}>
                Bạn đọc nổi bật tháng này
              </span>
            </div>

            {topReaders.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--ig-text-muted)' }}>
                Chưa có ai ghi nhận trang đọc trong tháng này.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topReaders.map((r) => (
                  <div key={r.biDanh} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'var(--ig-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {r.biDanh[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
                        {r.biDanh}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ig-text-muted)' }}>
                        {r.pagesRead} trang trong tháng
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Privacy Note Footer */}
        <div style={{ marginTop: 28, fontSize: 11, color: 'var(--ig-text-muted)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--emerald-400)', fontWeight: 600, marginBottom: 4 }}>
            <ShieldCheck size={12} /> novoli Privacy Pledge
          </div>
          Ẩn danh tuyệt đối • Không lưu vết IP • Không bán dữ liệu • 2026 novoli
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ig-right-rail {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
