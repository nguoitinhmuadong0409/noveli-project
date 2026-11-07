import React from 'react';
import { useAuth, ThemeMode } from '../context/AuthContext';
import { X, Palette, Check, Moon, Sun, Sparkles, Eye } from 'lucide-react';

interface ThemeSelectorModalProps {
  onClose: () => void;
}

interface ThemeOption {
  id: ThemeMode;
  name: string;
  badge: string;
  desc: string;
  bgHex: string;
  surfaceHex: string;
  textHex: string;
  accentHex: string;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onClose }) => {
  const { theme, setThemeMode } = useAuth();

  const darkThemes: ThemeOption[] = [
    {
      id: 'dark-coffee',
      name: 'Espresso Ấm Áp',
      badge: '☕ Khuyên dùng đọc đêm',
      desc: 'Tông nâu cà phê & ánh đèn vàng, êm dịu nhất khi đọc trong phòng tối',
      bgHex: '#151210',
      surfaceHex: '#1e1916',
      textHex: '#f5ede6',
      accentHex: '#e09f45',
    },
    {
      id: 'dark-midnight',
      name: 'Midnight OLED',
      badge: '🌑 Đen sâu thẳm',
      desc: 'Chuẩn Instagram Dark Mode, độ tương phản cao, tối ưu pin màn OLED',
      bgHex: '#000000',
      surfaceHex: '#121212',
      textHex: '#f5f5f5',
      accentHex: '#0095f6',
    },
    {
      id: 'dark-forest',
      name: 'Rừng Đêm Thư Thái',
      badge: '🌿 Xanh rêu dịu mắt',
      desc: 'Sắc xanh thông tự nhiên giúp thư giãn võng mạc và giảm áp lực thị giác',
      bgHex: '#0d1412',
      surfaceHex: '#131f1c',
      textHex: '#eaf3f0',
      accentHex: '#10b981',
    },
    {
      id: 'dark-navy',
      name: 'Biển Đêm Tĩnh Lặng',
      badge: '🌊 Xanh Navy sâu',
      desc: 'Không gian đọc sách tĩnh lặng, sang trọng và thanh lịch',
      bgHex: '#090e1a',
      surfaceHex: '#10182b',
      textHex: '#edf2fc',
      accentHex: '#3b82f6',
    },
  ];

  const lightThemes: ThemeOption[] = [
    {
      id: 'light-sepia',
      name: 'Giấy Cổ Điển Sepia',
      badge: '⭐ Mặc định • Như trang sách thật',
      desc: 'Màu giấy ngả vàng truyền thống, triệt tiêu ánh sáng xanh, đọc nhiều giờ không mỏi',
      bgHex: '#f6efe2',
      surfaceHex: '#fcf8f0',
      textHex: '#382c21',
      accentHex: '#8c4e1f',
    },
    {
      id: 'light-cream',
      name: 'Sữa Yến Mạch Tối Giản',
      badge: '🥛 Trắng ngà êm dịu',
      desc: 'Gam màu trắng kem trung tính, không chói gắt như trắng tinh của màn hình',
      bgHex: '#f8f8fa',
      surfaceHex: '#ffffff',
      textHex: '#1d2127',
      accentHex: '#0969da',
    },
    {
      id: 'light-matcha',
      name: 'Matcha Thanh Mát',
      badge: '🍵 Trà xanh dịu nhẹ',
      desc: 'Sắc xanh trà tươi mới nhẹ nhàng, tạo cảm giác thư thả bình yên ban ngày',
      bgHex: '#f2f7f3',
      surfaceHex: '#fbfdfb',
      textHex: '#1c3222',
      accentHex: '#15803d',
    },
    {
      id: 'light-peach',
      name: 'Hoàng Hôn Pastel',
      badge: '🍑 Phấn ấm dịu dàng',
      desc: 'Tông màu đào pastel ấm cúng, truyền cảm hứng lãng mạn nhẹ nhàng',
      bgHex: '#fcf5f1',
      surfaceHex: '#ffffff',
      textHex: '#3a2b26',
      accentHex: '#e06847',
    },
  ];

  const renderThemeCard = (item: ThemeOption) => {
    const isSelected = theme === item.id;
    return (
      <div
        key={item.id}
        onClick={() => setThemeMode(item.id)}
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: item.surfaceHex,
          border: isSelected ? `2px solid ${item.accentHex}` : '1px solid var(--ig-border)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
          boxShadow: isSelected ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        {/* Top: Swatches & Selected Mark */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Color Swatch Dot */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: item.bgHex,
                border: '1px solid rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: item.accentHex,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                backgroundColor: 'rgba(0,0,0,0.06)',
                color: item.textHex,
              }}
            >
              {item.badge}
            </span>
          </div>

          {isSelected && (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: item.accentHex,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Check size={12} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Name & Desc */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: item.textHex }}>
            {item.name}
          </div>
          <div style={{ fontSize: 12, color: item.textHex, opacity: 0.75, marginTop: 2, lineHeight: 1.4 }}>
            {item.desc}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--ig-surface)',
          border: '1px solid var(--ig-border)',
          borderRadius: 20,
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            padding: 6,
            borderRadius: 10,
            backgroundColor: 'var(--ig-elevated)',
            color: 'var(--ig-text)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--amber-400)',
            }}
          >
            <Palette size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ig-text)' }}>
              Phối Màu & Chế Độ Đọc Dịu Mắt (Eye-Care)
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ig-text-secondary)' }}>
              8 bảng màu được cân chỉnh nhiệt độ ánh sáng, giảm chói và chống mỏi mắt tối đa
            </p>
          </div>
        </div>

        {/* Section 1: Dark Modes */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--amber-400)', marginBottom: 12 }}>
            <Moon size={15} /> CHẾ ĐỘ TỐI (ĐỌC ĐÊM & ÁNH SÁNG YẾU)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {darkThemes.map(renderThemeCard)}
          </div>
        </div>

        {/* Section 2: Light Modes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--amber-400)', marginBottom: 12 }}>
            <Sun size={15} /> CHẾ ĐỘ SÁNG (GIẤY SÁCH & ÊM DỊU BAN NGÀY)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {lightThemes.map(renderThemeCard)}
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={onClose} className="btn btn-primary btn-sm" style={{ padding: '8px 24px' }}>
            Hoàn tất lựa chọn
          </button>
        </div>
      </div>
    </div>
  );
};
