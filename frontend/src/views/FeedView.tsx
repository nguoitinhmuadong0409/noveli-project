import React, { useState } from 'react';
import { FeedPost, Story, Book, ShelfType } from '../types';
import { StoriesBar } from '../components/StoriesBar';
import { InstagramPostCard } from '../components/InstagramPostCard';
import { useAuth } from '../context/AuthContext';
import { Flame, Sparkles, BookOpen, UserPlus, ShieldCheck } from 'lucide-react';

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

  const sampleStories: Story[] = [
    {
      id: 'story-1',
      user: { id: 'u1', biDanh: 'sach_va_tra', avatarSeed: 'tea' },
      type: 'reading',
      bookTitle: 'Rừng Na Uy',
      quote: 'Cái chết không phải là đối nghịch của sự sống mà là một phần của nó.',
      currentPage: 210,
      pageCount: 540,
      image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
      createdAt: '3 giờ trước',
      seen: false,
    },
    {
      id: 'story-2',
      user: { id: 'u2', biDanh: 'ke_ngao_du', avatarSeed: 'wanderer' },
      type: 'reading',
      bookTitle: 'Sapiens',
      quote: 'Chúng ta nghiên cứu lịch sử không phải để biết trước tương lai, mà để mở rộng chân trời của mình.',
      currentPage: 340,
      pageCount: 560,
      image: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800',
      createdAt: '5 giờ trước',
      seen: false,
    },
    {
      id: 'story-3',
      user: { id: 'u3', biDanh: 'dem_muon_doc_sach', avatarSeed: 'owl' },
      type: 'quote',
      bookTitle: 'Cây Cam Ngọt Của Tôi',
      quote: 'Tại sao người ta lại phải nói cho một đứa trẻ biết những điều như thế?',
      currentPage: 244,
      pageCount: 244,
      image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
      createdAt: '8 giờ trước',
      seen: true,
    },
    {
      id: 'story-4',
      user: { id: 'u4', biDanh: 'nguyen_nhat_anh_fan', avatarSeed: 'sky' },
      type: 'streak',
      bookTitle: 'Dế Mèn Phiêu Lưu Ký',
      quote: 'Biết chia sẻ là khởi đầu của sự trưởng thành.',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
      createdAt: '12 giờ trước',
      seen: true,
    },
    {
      id: 'story-5',
      user: { id: 'u5', biDanh: 'triet_hoc_dem', avatarSeed: 'brain' },
      type: 'reading',
      bookTitle: '1984',
      quote: 'Tự do là tự do nói rằng hai cộng hai bằng bốn.',
      currentPage: 156,
      pageCount: 328,
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
      createdAt: '1 ngày trước',
      seen: true,
    },
  ];

  const suggestedReaders = [
    { biDanh: 'doc_sach_cung_ban', role: 'Đang đọc: Nhà Giả Kim', streak: 15 },
    { biDanh: 'mọt_sach_hanoi', role: 'Đang đọc: Tâm Lý Học Về Tiền', streak: 9 },
    { biDanh: 'tra_va_sach_cu', role: 'Đang đọc: Tuổi Trẻ Đáng Giá Bao Nhiêu', streak: 22 },
  ];

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
        {/* Stories Bar */}
        <StoriesBar
          stories={sampleStories}
          onSelectStory={onSelectStory}
          onOpenCreateStory={onOpenCreatePost}
        />

        {/* Feed Posts */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {posts.map((post) => (
            <InstagramPostCard
              key={post.id}
              post={post}
              onSelectBook={onSelectBook}
              onSaveToShelf={onSaveToShelf}
            />
          ))}
        </div>
      </div>

      {/* ─── Right Column: Suggestions & User Card (Desktop) ─── */}
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

        {/* Quick Streak Goal Widget */}
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: 'var(--ig-surface)',
            border: '1px solid var(--ig-border)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
              Mục tiêu đọc hôm nay
            </span>
            <span className="badge badge-amber">
              <Sparkles size={11} /> Đạt 8/24 cuốn
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ig-text-secondary)', marginBottom: 10 }}>
            Đọc thêm 15 trang để không làm gián đoạn chuỗi streak {user?.currentStreak || 7} ngày!
          </p>
          <button
            onClick={onOpenLogModal}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
          >
            <BookOpen size={13} /> Ghi nhận trang sách
          </button>
        </div>

        {/* Suggestions Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text-muted)' }}>
            Gợi ý bạn đọc cho bạn
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ig-text)', cursor: 'pointer' }}>
            Xem tất cả
          </span>
        </div>

        {/* Suggested Users */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestedReaders.map((r) => (
            <div
              key={r.biDanh}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <div style={{ fontSize: 11, color: 'var(--ig-text-muted)' }}>{r.role}</div>
                </div>
              </div>

              <button
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ig-primary-blue)',
                  cursor: 'pointer',
                }}
              >
                Theo dõi
              </button>
            </div>
          ))}
        </div>

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
