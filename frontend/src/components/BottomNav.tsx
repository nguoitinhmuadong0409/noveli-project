import React from 'react';
import { TabType } from './Navbar';
import { Compass, Bookmark, TrendingUp, MessageSquare, Sparkles } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'discover', label: 'Khám Phá', icon: Compass },
    { id: 'shelves', label: 'Kệ Sách', icon: Bookmark },
    { id: 'analytics', label: 'Thống Kê', icon: TrendingUp },
    { id: 'forum', label: 'Diễn Đàn', icon: MessageSquare },
    { id: 'ai', label: 'Cố Vấn AI', icon: Sparkles },
  ] as const;

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              height: '100%',
              color: isActive ? 'var(--amber-400)' : 'var(--text-muted)',
              transition: 'color var(--transition-fast)',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>
              {item.label}
            </span>
          </button>
        );
      })}

      <style>{`
        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};
