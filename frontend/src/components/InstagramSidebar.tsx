import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Compass,
  Film,
  MessageSquare,
  PlusSquare,
  Bookmark,
  Palette,
  Flame,
  ShieldCheck,
  LayoutDashboard,
  Trophy,
  MessagesSquare,
  BarChart2, // ĐÃ THÊM: Icon cho Thống kê
} from 'lucide-react';

// ĐÃ THÊM: 'analytics' vào type IgTab
export type IgTab = 'home' | 'search' | 'explore' | 'reels' | 'forum' | 'shelves' | 'analytics' | 'leaderboard' | 'chat' | 'profile' | 'admin';

interface InstagramSidebarProps {
  activeTab: IgTab;
  onTabChange: (tab: IgTab) => void;
  onOpenCreateModal: () => void;
  onOpenAuthModal: () => void;
  onOpenLogModal: () => void;
  onOpenThemeModal: () => void;
}

export const InstagramSidebar: React.FC<InstagramSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
  onOpenAuthModal,
  onOpenLogModal,
  onOpenThemeModal,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'explore', label: 'Khám phá', icon: Compass },
    { id: 'reels', label: 'Trích dẫn', icon: Film },
    { id: 'shelves', label: 'Kệ sách', icon: Bookmark },
    { id: 'chat', label: 'Trò chuyện', icon: MessagesSquare },
    { id: 'forum', label: 'Diễn đàn', icon: MessageSquare },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
    ...(user?.role === 'admin' ? [{ id: 'admin' as const, label: 'Quản trị', icon: LayoutDashboard }] : []),
  ] as const;

  return (
    <aside
      className="ig-desktop-sidebar"
      style={{
        width: 245,
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid var(--ig-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 12px 20px',
        backgroundColor: 'var(--ig-bg)',
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      <div>
        {/* Instagram / novoli Brand Logo */}
        <div
          onClick={() => onTabChange('home')}
          style={{
            padding: '12px 14px 28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--ig-story-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            📚
          </div>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            novoli
          </span>
        </div>

        {/* Nav Items List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as IgTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'var(--ig-text)' : 'var(--ig-text-secondary)',
                  backgroundColor: isActive ? 'var(--ig-elevated)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="ig-nav-btn"
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? 'var(--ig-text)' : 'var(--ig-text-secondary)'} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Create Post Button */}
          <button
            onClick={onOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 14px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ig-text)',
              cursor: 'pointer',
              marginTop: 4,
            }}
            className="ig-nav-btn"
          >
            <PlusSquare size={24} strokeWidth={1.8} />
            <span>Tạo bài viết</span>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => onTabChange('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 14px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: activeTab === 'profile' ? 700 : 400,
              color: activeTab === 'profile' ? 'var(--ig-text)' : 'var(--ig-text-secondary)',
              backgroundColor: activeTab === 'profile' ? 'var(--ig-elevated)' : 'transparent',
              cursor: 'pointer',
            }}
            className="ig-nav-btn"
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--ig-story-gradient)',
                padding: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ig-text)',
                }}
              >
                {user ? user.biDanh[0].toUpperCase() : 'U'}
              </div>
            </div>
            <span>Trang cá nhân</span>
          </button>

          {/* Eye-Care Theme Palette button */}
          <button
            onClick={onOpenThemeModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 14px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--amber-400)',
              cursor: 'pointer',
              marginTop: 4,
            }}
            className="ig-nav-btn"
          >
            <Palette size={24} strokeWidth={1.8} />
            <span>Chế độ dịu mắt</span>
          </button>
        </nav>
      </div>

      {/* Bottom Controls: Streak & More Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Streak Pill */}
        {user && (
          <div
            onClick={onOpenLogModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={18} fill="var(--amber-400)" color="var(--amber-500)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-400)' }}>
                {user.currentStreak || 0} ngày streak
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--amber-400)' }}>+Ghi</span>
          </div>
        )}

        {/* Account Switcher & Theme Selector Modal Button */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onOpenAuthModal}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'flex-start', fontSize: 12 }}
          >
            <ShieldCheck size={14} color="var(--emerald-400)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{user ? user.biDanh : 'tài khoản'}
            </span>
          </button>

          <button
            onClick={onOpenThemeModal}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', color: 'var(--amber-400)' }}
            title="Đổi phối màu dịu mắt (8 giao diện sáng/tối)"
          >
            <Palette size={15} />
          </button>
        </div>
      </div>

      <style>{`
        .ig-nav-btn:hover {
          background-color: var(--ig-elevated);
        }
        @media (max-width: 768px) {
          .ig-desktop-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
};
