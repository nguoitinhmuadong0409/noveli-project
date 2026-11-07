import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstagramSidebar, IgTab } from './components/InstagramSidebar';
import { FeedView } from './views/FeedView';
import { ExploreView } from './views/ExploreView';
import { ReelsQuotesView } from './views/ReelsQuotesView';
import { ShelvesView } from './views/ShelvesView';
import { ForumView } from './views/ForumView';
import { ProfileView } from './views/ProfileView';
import { StoryViewerModal } from './components/StoryViewerModal';
import { CreatePostModal } from './components/CreatePostModal';
import { BookDetailModal } from './components/BookDetailModal';
import { ReadingLogModal } from './components/ReadingLogModal';
import { AuthModal } from './components/AuthModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { AdminView } from './views/AdminView';
import { LeaderboardView } from './views/LeaderboardView';
import { ChatView } from './views/ChatView';
import { FeedPost, Story, Book, ShelfType } from './types';
import { api } from './services/api';
import { Home, Compass, Film, Bookmark, MessageSquare, ShieldCheck, Trophy, MessagesSquare } from 'lucide-react';

function InstagramApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<IgTab>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openLogModal, setOpenLogModal] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openThemeModal, setOpenThemeModal] = useState(false);

  // Initial Instagram Feed Posts
  const [posts, setPosts] = useState<FeedPost[]>([
    {
      id: 'post-1',
      author: {
        id: 'u1',
        biDanh: 'sach_va_tra',
        avatarSeed: 'tea',
      },
      book: {
        id: 'b1',
        title: 'Rừng Na Uy (Norwegian Wood)',
        authors: ['Haruki Murakami'],
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
        avgRating: 4.8,
        pageCount: 540,
        categories: ['Tiểu thuyết', 'Văn học Nhật Bản'],
      },
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000&auto=format&fit=crop&q=80',
      caption: 'Một buổi tối yên ả cùng Murakami... "Cái chết không phải là đối nghịch của sự sống mà là một phần của nó." Từng trang sách như đưa ta về những năm tháng cô đơn đẹp đẽ của tuổi đôi mươi. ☕📖 #Murakami #Bookstagram #ReadingTime #NorwegianWood',
      likesCount: 142,
      isLiked: false,
      isSaved: true,
      commentsCount: 12,
      currentPage: 210,
      pageCount: 540,
      hasSpoilers: false,
      createdAt: '2 giờ trước',
      comments: [
        { id: 'c1', author: 'ke_ngao_du', content: 'Đoạn nói về Midori làm mình suy nghĩ rất nhiều!', createdAt: '1 giờ trước' },
        { id: 'c2', author: 'dem_muon_doc_sach', content: 'Murakami viết nỗi buồn mà không hề bi lụy, đọc đi đọc lại vẫn xúc động.', createdAt: '45 phút trước' },
      ],
    },
    {
      id: 'post-2',
      author: {
        id: 'u2',
        biDanh: 'ke_ngao_du',
        avatarSeed: 'wanderer',
      },
      book: {
        id: 'b2',
        title: 'Sapiens: Lược Sử Loài Người',
        authors: ['Yuval Noah Harari'],
        coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800',
        avgRating: 4.9,
        pageCount: 560,
        categories: ['Lịch sử', 'Khoa học xã hội'],
      },
      image: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=1000&auto=format&fit=crop&q=80',
      caption: 'Khi bạn nhận ra rằng trật tự xã hội, tiền tệ và các đế chế chỉ tồn tại nhờ "khả năng tưởng tượng tập thể". Đọc Sapiens xong cảm giác như góc nhìn về thế giới được reboot hoàn toàn! 🌍✨ #Sapiens #YuvalNoahHarari #KnowledgeIsPower',
      likesCount: 238,
      isLiked: true,
      isSaved: false,
      commentsCount: 24,
      currentPage: 340,
      pageCount: 560,
      hasSpoilers: false,
      createdAt: '5 giờ trước',
      comments: [
        { id: 'c3', author: 'sach_va_tra', content: 'Chương về cách mạng nhận thức xuất sắc thực sự.', createdAt: '3 giờ trước' },
      ],
    },
    {
      id: 'post-3',
      author: {
        id: 'u3',
        biDanh: 'dem_muon_doc_sach',
        avatarSeed: 'owl',
      },
      book: {
        id: 'b3',
        title: 'Cây Cam Ngọt Của Tôi',
        authors: ['José Mauro de Vasconcelos'],
        coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
        avgRating: 4.9,
        pageCount: 244,
        categories: ['Tiểu thuyết', 'Gia đình'],
      },
      image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1000&auto=format&fit=crop&q=80',
      caption: 'Khóc nức nở lúc 1 giờ sáng... Tình cảm ấm áp của ông Bồ và sự cô độc của chú bé Zezé 5 tuổi sẽ mãi ở lại trong tim mình. "Ai đã ở trên đời thì đều xứng đáng được sinh ra cả con ạ." 🍊🧡 #CayCamNgotCuaToi #Emotion #MustRead',
      likesCount: 312,
      isLiked: false,
      isSaved: true,
      commentsCount: 39,
      currentPage: 244,
      pageCount: 244,
      hasSpoilers: false,
      createdAt: '1 ngày trước',
      comments: [
        { id: 'c4', author: 'ke_ngao_du', content: 'Cuốn sách này tốn nước mắt thật sự...', createdAt: '18 giờ trước' },
      ],
    },
  ]);

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

  const mobileNavItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'explore', label: 'Khám phá', icon: Compass },
    { id: 'reels', label: 'Trích dẫn', icon: Film },
    { id: 'shelves', label: 'Kệ sách', icon: Bookmark },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
    { id: 'chat', label: 'Trò chuyện', icon: MessagesSquare },
    { id: 'forum', label: 'Diễn đàn', icon: MessageSquare },
    ...(user?.role === 'admin' ? [{ id: 'admin' as const, label: 'Quản trị', icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--ig-bg)' }}>
      {/* ─── 1. Desktop Left Instagram Sidebar ───────────────── */}
      <InstagramSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
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

        {activeTab === 'forum' && <ForumView />}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'chat' && <ChatView onOpenAuthModal={() => setOpenAuthModal(true)} />}

        {activeTab === 'admin' && user?.role === 'admin' && <AdminView />}

        {activeTab === 'profile' && (
          <ProfileView
            userPosts={posts.filter((p) => p.author.biDanh === user?.biDanh || p.author.biDanh === 'sach_va_tra')}
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
              onClick={() => setActiveTab(item.id)}
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
