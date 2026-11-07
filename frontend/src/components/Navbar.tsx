import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Bookmark,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Flame,
  ShieldCheck,
  Moon,
  Sun,
  UserCheck,
} from 'lucide-react';

export type TabType = 'discover' | 'shelves' | 'analytics' | 'forum' | 'ai';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenLogModal: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenLogModal,
  onOpenAuthModal,
}) => {
  const { user, theme, toggleTheme } = useAuth();

  const navItems = [
    { id: 'discover', label: 'Khám Phá', icon: Compass },
    { id: 'shelves', label: 'Kệ Sách', icon: Bookmark },
    { id: 'analytics', label: 'Thống Kê', icon: TrendingUp },
    { id: 'forum', label: 'Diễn Đàn Ẩn Danh', icon: MessageSquare },
    { id: 'ai', label: 'Cố Vấn AI', icon: Sparkles },
  ] as const;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 20px',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange('discover')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--amber-500), #e11d48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px var(--amber-glow)',
            }}
          >
            📚
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #f8fafc, var(--amber-400))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              novoli
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: 'var(--emerald-400)',
                fontWeight: 600,
                marginTop: -3,
              }}
            >
              <ShieldCheck size={11} /> Privacy First
            </div>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav
          style={{
            display: 'none',
            gap: 6,
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: isActive ? 'var(--amber-400)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Streak & User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Streak Indicator Button */}
          {user && (
            <button
              onClick={onOpenLogModal}
              title="Ghi nhật ký đọc sách để giữ chuỗi streak"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 9999,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: 'var(--amber-400)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <span className="animate-streak-fire" style={{ display: 'inline-flex' }}>
                <Flame size={16} fill="var(--amber-400)" color="var(--amber-500)" />
              </span>
              <span>{user.currentStreak} ngày</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={theme.startsWith('dark') ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {theme.startsWith('dark') ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Pseudonym Account Badge */}
          <button
            onClick={onOpenAuthModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 10,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              {user ? user.biDanh.slice(0, 1).toUpperCase() : '?'}
            </div>
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? `@${user.biDanh}` : 'Tài khoản'}
            </span>
            <UserCheck size={14} color="var(--emerald-400)" />
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};
