import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstagramSidebar, IgTab } from './components/InstagramSidebar';
import { FeedView } from './views/FeedView';
import { ExploreView } from './views/ExploreView';
import { ReelsQuotesView } from './views/ReelsQuotesView';
import { ShelvesView } from './views/ShelvesView';
import { ForumView } from './views/ForumView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { LeaderboardView } from './views/LeaderboardView';
import { ChatView } from './views/ChatView';
// 1. ĐÃ THÊM: Import AnalyticsView
import { AnalyticsView } from './views/AnalyticsView';

import { StoryViewerModal } from './components/StoryViewerModal';
import { CreatePostModal } from './components/CreatePostModal';
import { BookDetailModal } from './components/BookDetailModal';
import { ReadingLogModal } from './components/ReadingLogModal';
import { AuthModal } from './components/AuthModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { FeedPost, Story, Book, ShelfType } from './types';
import { api } from './services/api';
// 2. ĐÃ THÊM: Import BarChart2 icon cho Thống kê
import { Home, Compass, Film, Bookmark, MessageSquare, ShieldCheck, Trophy, MessagesSquare, BarChart2 } from 'lucide-react';

function InstagramApp() {
  const { user } = useAuth();
  // Lưu ý: Thầy cần đảm bảo type IgTab trong file InstagramSidebar có bao gồm 'analytics'
  const [activeTab, setActiveTab] = useState<IgTab | 'analytics'>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openLogModal, setOpenLogModal] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openThemeModal, setOpenThemeModal] = useState(false);

  // Danh sách bài đăng thật, tải từ máy chủ khi đã đăng nhập.
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    api
      .getFeedPosts()
      .then((res) => {
        if (!cancelled) setPosts(res.posts);
      })
      .catch((err) => console.warn('Feed load:', err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSaveToShelf = async (book: Book, type: ShelfType) => {
    try {
      await api.upsertShelf(book.id, type);
    } catch (err) {
      console.warn('Shelf sync:', err);
    }
  };

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setActiveTab('home');
  };

  // 3. ĐÃ THÊM: Mục Analytics vào menu điều hướng dưới cùng (cho Mobile)
  const mobileNavItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'explore', label: 'Khám phá', icon: Compass },
    { id: 'reels', label: 'Trích dẫn', icon: Film },
    { id: 'shelves', label: 'Kệ sách', icon: Bookmark },
    { id: 'chat', label: 'Trò chuyện', icon: MessagesSquare },
    { id: 'forum', label: 'Diễn đàn', icon: MessageSquare },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
    ...(user?.role === 'admin' ? [{ id: 'admin' as const, label: 'Quản trị', icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--ig-bg)' }}>
      {/* ─── 1. Desktop Left Instagram Sidebar ───────────────── */}
      <InstagramSidebar
        activeTab={activeTab as any}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenCreateModal={() => setOpenCreateModal(true)}
        onOpenAuthModal={() => setOpenAuthModal(true)}
        onOpenLogModal={() => setOpenLogModal(true)}
        onOpenThemeModal={() => setOpenThemeModal(true)}
      />

      {/* ─── 2. Main Content Feed / Active View ──────────────── */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'home' && (
          <FeedView
            posts={posts}
            onSelectBook={(book) => setSelectedBook(book)}
            onSaveToShelf={handleSaveToShelf}
            onSelectStory={(story) => setSelectedStory(story)}
            onOpenCreatePost={() => setOpenCreateModal(true)}
            onOpenLogModal={() => setOpenLogModal(true)}
            onOpenAuthModal={() => setOpenAuthModal(true)}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView onSelectBook={(book) => setSelectedBook(book)} />
        )}

        {activeTab === 'reels' && (
          <ReelsQuotesView onSelectBook={(book) => setSelectedBook(book)} />
        )}

        {activeTab === 'shelves' && (
          <ShelvesView
            onSelectBook={(book) => setSelectedBook(book)}
            onNavigateDiscover={() => setActiveTab('explore')}
          />
        )}

        {/* 4. ĐÃ THÊM: Gọi component AnalyticsView */}
        {activeTab === 'analytics' && (
          <AnalyticsView 
            onOpenLogModal={() => setOpenLogModal(true)} 
            books={[]} // TODO: Thay mảng rỗng bằng state chứa dữ liệu Kệ sách thật (nếu có)
          />
        )}

        {activeTab === 'forum' && <ForumView />}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'chat' && <ChatView onOpenAuthModal={() => setOpenAuthModal(true)} />}

        {activeTab === 'admin' && user?.role === 'admin' && <AdminView />}

        {activeTab === 'profile' && (
          <ProfileView
            userPosts={posts.filter((p) => p.author.biDanh === user?.biDanh)}
            onSelectBook={(book) => setSelectedBook(book)}
            onNavigateDiscover={() => setActiveTab('explore')}
            onOpenAuthModal={() => setOpenAuthModal(true)}
            onOpenLogModal={() => setOpenLogModal(true)}
          />
        )}
      </main>

      {/* ─── 3. Mobile Instagram Bottom Bar ──────────────────── */}
      <nav
        className="ig-mobile-bottom-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 52,
          backgroundColor: 'var(--ig-bg)',
          borderTop: '1px solid var(--ig-border)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: isActive ? 'var(--ig-text)' : 'var(--ig-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            </button>
          );
        })}

        {/* Profile on mobile */}
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: activeTab === 'profile' ? '2px solid var(--ig-text)' : '1px solid var(--ig-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user ? user.biDanh[0].toUpperCase() : 'U'}
          </div>
        </button>

        <style>{`
          @media (min-width: 769px) {
            .ig-mobile-bottom-bar {
              display: none !important;
            }
          }
        `}</style>
      </nav>

      {/* ─── 4. Modals ───────────────────────────────────────── */}
      {selectedStory && (
        <StoryViewerModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onShelfChange={handleSaveToShelf}
        />
      )}

      {openCreateModal && (
        <CreatePostModal
          onClose={() => setOpenCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {openLogModal && (
        <ReadingLogModal onClose={() => setOpenLogModal(false)} />
      )}

      {openAuthModal && (
        <AuthModal onClose={() => setOpenAuthModal(false)} />
      )}

      {openThemeModal && (
        <ThemeSelectorModal onClose={() => setOpenThemeModal(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InstagramApp />
    </AuthProvider>
  );
}
