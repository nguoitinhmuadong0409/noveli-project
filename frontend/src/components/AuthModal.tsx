import React, { useState } from 'react';
import { useAuth, ThemeMode } from '../context/AuthContext';
import {
  X,
  ShieldCheck,
  UserCheck,
  Lock,
  Sparkles,
  LogOut,
  LogIn,
  KeyRound,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Dices,
  Copy,
  Download,
  CheckCircle2,
  Palette,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'register' | 'login' | 'switch' | 'recover';
}

type TabMode = 'register' | 'login' | 'switch' | 'recover';

const THEME_OPTIONS: { id: ThemeMode; name: string; icon: string; short: string; isDark: boolean }[] = [
  { id: 'dark-coffee', name: 'Espresso Ấm Áp', icon: '☕', short: 'Espresso', isDark: true },
  { id: 'dark-midnight', name: 'Midnight OLED', icon: '🌑', short: 'Midnight', isDark: true },
  { id: 'dark-forest', name: 'Rừng Đêm Thư Thái', icon: '🌲', short: 'Rừng đêm', isDark: true },
  { id: 'dark-navy', name: 'Biển Đêm Tĩnh Lặng', icon: '🌊', short: 'Biển đêm', isDark: true },
  { id: 'light-sepia', name: 'Giấy Cổ Điển Sepia', icon: '📜', short: 'Sepia', isDark: false },
  { id: 'light-cream', name: 'Sữa Yến Mạch Tối Giản', icon: '🥛', short: 'Yến mạch', isDark: false },
  { id: 'light-matcha', name: 'Matcha Thanh Mát', icon: '🍵', short: 'Matcha', isDark: false },
  { id: 'light-peach', name: 'Hoàng Hôn Pastel', icon: '🌅', short: 'Hoàng hôn', isDark: false },
];

const PSEUDONYM_SUGGESTIONS = [
  'triet_hoc_dem',
  'ke_ngao_du_99',
  'sach_va_tra',
  'cu_dem_doc_sach',
  'trang_sach_cuoi',
  'hoa_huong_duong',
  'tiem_sach_mua',
  'nguoi_ke_chuyen',
  'doc_gia_tram_lang',
  'may_bay_giay',
  'ngon_hai_dang',
  'gio_mua_ha',
];

const AVATAR_MOODS = [
  { id: 'owl', icon: '🦉', label: 'Cú đêm' },
  { id: 'tea', icon: '☕', label: 'Tách trà' },
  { id: 'fox', icon: '🦊', label: 'Cáo cam' },
  { id: 'sprout', icon: '🌿', label: 'Mầm lá' },
  { id: 'rocket', icon: '🚀', label: 'Du hành' },
  { id: 'crystal', icon: '🔮', label: 'Huyền bí' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialMode }) => {
  const { user, login, register, switchDemoUser, logout, logoutAll, changePassword, recoverPassword, updateProfile, theme, setThemeMode } = useAuth();
  
  // Default to register or user-selected initial mode
  const [mode, setMode] = useState<TabMode>(() => {
    const defaultMode = initialMode || (user ? 'switch' : 'register');
    return !import.meta.env.DEV && defaultMode === 'switch' ? 'register' : defaultMode;
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Register Form State
  const [regBiDanh, setRegBiDanh] = useState('');
  const [ownerSetupKey, setOwnerSetupKey] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [selectedMood, setSelectedMood] = useState('owl');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Login Form State
  const [loginBiDanh, setLoginBiDanh] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Recovery Form State
  const [recBiDanh, setRecBiDanh] = useState('');
  const [recKeyInput, setRecKeyInput] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [showRecPassword, setShowRecPassword] = useState(false);

  // Change Password State
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showRecoveryKeyRotate, setShowRecoveryKeyRotate] = useState(false);
  const [recoveryKeyPassword, setRecoveryKeyPassword] = useState('');
  const [rotatedRecoveryKey, setRotatedRecoveryKey] = useState<string | null>(null);

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const demoAccounts = [
    { biDanh: 'sach_va_tra', role: 'Độc giả yêu trà & triết học', streak: 7, avatar: '☕' },
    { biDanh: 'ke_ngao_du', role: 'Thích phiêu lưu & khoa học viễn tưởng', streak: 12, avatar: '🚀' },
    { biDanh: 'dem_muon_doc_sach', role: 'Cú đêm đọc tiểu thuyết cảm động', streak: 3, avatar: '🦉' },
  ];

  const clearFeedback = () => {
    setError(null);
    setSuccessMsg(null);
  };

  // Password strength logic
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập', color: 'var(--ig-text-muted)' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Yếu', color: '#f43f5e' };
    if (score <= 3) return { score: 2, label: 'Khá tốt', color: 'var(--amber-400)' };
    return { score: 3, label: 'Rất mạnh', color: '#10b981' };
  };

  const passStrength = calculatePasswordStrength(regPassword);
  const configuredOwnerBiDanh = (import.meta.env.VITE_OWNER_BIDAN?.trim() || 'hoanglinh').toLowerCase();
  const isOwnerRegistration = Boolean(configuredOwnerBiDanh && regBiDanh.trim().toLowerCase() === configuredOwnerBiDanh);

  const getRandomPseudonym = () => {
    const randomName = PSEUDONYM_SUGGESTIONS[Math.floor(Math.random() * PSEUDONYM_SUGGESTIONS.length)];
    const suffix = Math.floor(Math.random() * 89 + 10);
    const generated = `${randomName}_${suffix}`;
    setRegBiDanh(generated);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const cleanBiDanh = regBiDanh.trim().toLowerCase();

    if (!cleanBiDanh) {
      setError('Vui lòng nhập bí danh của bạn');
      return;
    }

    if (cleanBiDanh.length < 3 || cleanBiDanh.length > 30) {
      setError('Bí danh phải từ 3 đến 30 ký tự');
      return;
    }

    if (!regPassword) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (regPassword.length < 8) {
      setError('Mật khẩu bảo mật phải có ít nhất 8 ký tự');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu nhập lại không trùng khớp');
      return;
    }

    setSubmitting(true);
    try {
      const recKey = await register(cleanBiDanh, regPassword, isOwnerRegistration ? ownerSetupKey : undefined);
      setRecoveryKey(recKey);
      
      // Update avatar seed to selected mood
      try {
        await updateProfile({ avatarSeed: selectedMood });
      } catch {
        // non-blocking
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      setError((err as Error).message || 'Đăng ký bí danh không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    const key = recoveryKey ?? rotatedRecoveryKey;
    if (!key) return;
    navigator.clipboard?.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleDownloadKey = () => {
    const key = recoveryKey ?? rotatedRecoveryKey;
    if (!key) return;
    const content = `novoli — MÃ KHÔI PHỤC TÀI KHOẢN (RECOVERY KEY)
=====================================================
Bí danh (Username): @${user?.biDanh ?? regBiDanh.trim()}
Mã khôi phục duy nhất: ${key}
Ngày tạo: ${new Date().toLocaleString('vi-VN')}
Giao diện đọc đang chọn: ${THEME_OPTIONS.find((t) => t.id === theme)?.name || theme}

LƯU Ý BẢO MẬT:
novoli hoạt động theo kiến trúc Zero-Knowledge:
- Không lưu Email, không lưu Số điện thoại, không lưu IP của bạn.
- Mã này là CÁCH DUY NHẤT để khôi phục tài khoản nếu bạn quên mật khẩu.
- Hãy cất file này ở nơi an toàn (ghi chú bảo mật, ổ cứng cá nhân).
=====================================================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novoli-recovery-${user?.biDanh ?? regBiDanh.trim()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!loginBiDanh.trim() || !loginPassword) return;

    setSubmitting(true);
    try {
      await login(loginBiDanh.trim(), loginPassword);
      setSuccessMsg('Đăng nhập thành công! Chào mừng trở lại.');
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setError((err as Error).message || 'Bí danh hoặc mật khẩu không chính xác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!recBiDanh.trim() || !recKeyInput.trim() || !recNewPassword) return;

    if (recNewPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }

    setSubmitting(true);
    try {
      await recoverPassword(recBiDanh.trim(), recKeyInput.trim(), recNewPassword);
      setSuccessMsg('Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.');
      setMode('login');
      setLoginBiDanh(recBiDanh.trim());
      setLoginPassword('');
    } catch (err) {
      setError((err as Error).message || 'Mã khôi phục hoặc bí danh không chính xác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!currentPass || !newPass) return;

    if (newPass.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự trở lên');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPass, newPass);
      setSuccessMsg('Đổi mật khẩu thành công!');
      setShowChangePass(false);
      setCurrentPass('');
      setNewPass('');
    } catch (err) {
      setError((err as Error).message || 'Đổi mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      const result = await api.rotateRecoveryKey(recoveryKeyPassword);
      setRotatedRecoveryKey(result.recoveryKey);
      setRecoveryKey(null);
      setRecoveryKeyPassword('');
      setShowRecoveryKeyRotate(false);
      setSuccessMsg('Đã thay khóa khôi phục. Khóa cũ không còn sử dụng được; hãy lưu khóa mới ngay.');
    } catch (err) {
      setError((err as Error).message || 'Không thể thay khóa khôi phục.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 530,
          maxHeight: '94vh',
          overflowY: 'auto',
          backgroundColor: 'var(--ig-surface)',
          border: '1px solid var(--ig-border)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--ig-border-subtle)',
          padding: '24px 22px',
          borderRadius: 24,
          position: 'relative',
          color: 'var(--ig-text)',
          boxSizing: 'border-box',
          transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls: 8 Theme Quick Switcher Toggle + Close Button */}
        <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              background: showThemePicker ? 'var(--ig-primary-blue)' : 'var(--ig-elevated)',
              border: '1px solid var(--ig-border)',
              color: showThemePicker ? '#ffffff' : 'var(--ig-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Đổi giao diện (8 theme dịu mắt)"
          >
            <Palette size={14} />
            <span>Theme</span>
          </button>

          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--ig-elevated)',
              border: '1px solid var(--ig-border)',
              color: 'var(--ig-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Đóng cửa sổ"
          >
            <X size={17} />
          </button>
        </div>

        {/* 8 Themes Quick Selection Drawer */}
        {showThemePicker && (
          <div
            style={{
              marginBottom: 18,
              padding: '12px 14px',
              borderRadius: 16,
              background: 'var(--ig-elevated)',
              border: '1px solid var(--ig-border)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ig-text)' }}>
                🎨 Chọn 1 trong 8 Giao Diện Dịu Mắt:
              </span>
              <span style={{ fontSize: 11, color: 'var(--ig-text-muted)' }}>
                Đang dùng: <strong>{THEME_OPTIONS.find((t) => t.id === theme)?.name}</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {THEME_OPTIONS.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeMode(t.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 10,
                      background: isActive ? 'var(--ig-primary-blue)' : 'var(--ig-surface)',
                      border: isActive ? '1.5px solid var(--ig-primary-blue)' : '1px solid var(--ig-border-subtle)',
                      color: isActive ? '#ffffff' : 'var(--ig-text)',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.15s ease',
                    }}
                    title={t.name}
                  >
                    <span style={{ fontSize: 15 }}>{t.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {t.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Header Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, paddingRight: 90 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--ig-story-gradient)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            📚
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ig-text)', letterSpacing: '-0.02em' }}>
                novoli
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--emerald-500)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                Zero-Tracking
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ig-text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              Không cần Email hay SĐT — Quyền riêng tư tuyệt đối cho độc giả
            </p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: 'var(--rose-400)',
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--rose-500)' }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: 'var(--emerald-400)',
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            <Check size={18} style={{ flexShrink: 0, color: 'var(--emerald-500)' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current Logged-in User Card */}
        {user && (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'var(--ig-elevated)',
              border: '1px solid var(--ig-border)',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--ig-story-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 20,
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {user.biDanh[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ig-text)' }}>@{user.biDanh}</div>
                  <div style={{ fontSize: 13, color: 'var(--amber-400)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span>Chuỗi đọc: <strong>{user.currentStreak} ngày</strong> liên tiếp 🔥</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowChangePass(!showChangePass)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--ig-surface)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Đổi mật khẩu tài khoản"
                >
                  <KeyRound size={14} /> Đổi pass
                </button>
                <button
                  onClick={() => setShowRecoveryKeyRotate(!showRecoveryKeyRotate)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: 'var(--ig-surface)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Thay khóa khôi phục đã bị lộ"
                >
                  <KeyRound size={14} /> Đổi mã khôi phục
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--rose-400)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Đăng xuất khỏi thiết bị này"
                >
                  <LogOut size={14} /> Thoát
                </button>
              </div>
            </div>

            {/* Logout all devices link */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--ig-border-subtle)' }}>
              <button
                onClick={logoutAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ig-text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Đăng xuất khỏi tất cả các thiết bị
              </button>
            </div>

            {showRecoveryKeyRotate && (
              <form onSubmit={handleRotateRecoveryKey} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--ig-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--ig-text-secondary)' }}>
                  Xác nhận mật khẩu hiện tại để vô hiệu hóa mã cũ và tạo mã khôi phục mới.
                </p>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={recoveryKeyPassword}
                  onChange={(event) => setRecoveryKeyPassword(event.target.value)}
                  required
                  placeholder="Mật khẩu hiện tại"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--ig-surface)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Đang tạo mã mới...' : 'Tạo mã khôi phục mới'}
                </button>
              </form>
            )}

            {rotatedRecoveryKey && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'var(--ig-surface)', border: '1px solid var(--amber-500)' }}>
                <p style={{ fontSize: 12, color: 'var(--ig-text-secondary)', marginBottom: 8 }}>
                  Mã mới chỉ hiển thị lần này. Hãy lưu an toàn trước khi đóng cửa sổ.
                </p>
                <code style={{ display: 'block', overflowWrap: 'anywhere', fontWeight: 800, color: 'var(--amber-400)', marginBottom: 10 }}>
                  {rotatedRecoveryKey}
                </code>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleCopyKey} className="btn btn-secondary">Sao chép</button>
                  <button type="button" onClick={handleDownloadKey} className="btn btn-secondary">Tải mã</button>
                </div>
              </div>
            )}

            {/* Change Password Dropdown */}
            {showChangePass && (
              <form onSubmit={handleChangePassword} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--ig-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    placeholder="Mật khẩu hiện tại"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: 10,
                      background: 'var(--ig-surface)',
                      border: '1px solid var(--ig-border)',
                      color: 'var(--ig-text)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ig-text-secondary)', cursor: 'pointer' }}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: 10,
                      background: 'var(--ig-surface)',
                      border: '1px solid var(--ig-border)',
                      color: 'var(--ig-text)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--ig-text-secondary)', cursor: 'pointer' }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 10,
                      background: 'var(--ig-story-gradient)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChangePass(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--ig-surface)',
                      border: '1px solid var(--ig-border)',
                      color: 'var(--ig-text-secondary)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 20,
            background: 'var(--ig-elevated)',
            padding: 5,
            borderRadius: 14,
            border: '1px solid var(--ig-border)',
          }}
        >
          <button
            onClick={() => { setMode('register'); clearFeedback(); }}
            style={{
              flex: 1.2,
              padding: '9px 10px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'register' ? 'var(--ig-story-gradient)' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--ig-text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: mode === 'register' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={15} /> Tạo tài khoản
          </button>
          <button
            onClick={() => { setMode('login'); clearFeedback(); }}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'login' ? 'var(--ig-story-gradient)' : 'transparent',
              color: mode === 'login' ? '#ffffff' : 'var(--ig-text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: mode === 'login' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <LogIn size={15} /> Đăng nhập
          </button>
          <button
            onClick={() => { setMode('switch'); clearFeedback(); }}
            style={{
              flex: 0.8,
              padding: '9px 10px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'switch' ? 'var(--amber-500)' : 'transparent',
              color: mode === 'switch' ? '#ffffff' : 'var(--ig-text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: import.meta.env.DEV ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxShadow: mode === 'switch' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={14} /> Demo
          </button>
          <button
            onClick={() => { setMode('recover'); clearFeedback(); }}
            style={{
              flex: 0.9,
              padding: '9px 10px',
              borderRadius: 10,
              border: 'none',
              background: mode === 'recover' ? 'var(--ig-story-gradient)' : 'transparent',
              color: mode === 'recover' ? '#ffffff' : 'var(--ig-text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxShadow: mode === 'recover' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={14} /> Khôi phục
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            MODE 1: CREATE ACCOUNT (TẠO TÀI KHOẢN UI/UX)
           ═══════════════════════════════════════════════════════════ */}
        {mode === 'register' && (
          <div>
            {recoveryKey ? (
              /* Success Celebration State with Recovery Key */
              <div
                style={{
                  padding: 22,
                  borderRadius: 18,
                  background: 'var(--ig-elevated)',
                  border: '1px solid var(--emerald-500)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--emerald-500)', fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
                  <CheckCircle2 size={22} /> Bí danh @{regBiDanh} đã sẵn sàng!
                </div>
                <p style={{ fontSize: 13, color: 'var(--ig-text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  Vì novoli <strong>không lưu Email hay Số điện thoại</strong> của bạn, đây là mã khôi phục bí mật (160-bit) duy nhất để lấy lại tài khoản nếu bạn quên mật khẩu:
                </p>

                {/* Key Container Box */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'var(--ig-surface)',
                    border: '1.5px dashed var(--amber-500)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--amber-400)',
                    letterSpacing: '0.04em',
                    wordBreak: 'break-all',
                    textAlign: 'center',
                    userSelect: 'all',
                    boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.2)',
                    marginBottom: 14,
                  }}
                >
                  {recoveryKey}
                </div>

                {/* Action Buttons: Copy & Download */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <button
                    onClick={handleCopyKey}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: 12,
                      background: copiedKey ? 'var(--emerald-500)' : 'var(--ig-surface)',
                      border: '1px solid var(--ig-border)',
                      color: copiedKey ? '#ffffff' : 'var(--ig-text)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                    {copiedKey ? 'Đã sao chép!' : 'Sao chép mã'}
                  </button>

                  <button
                    onClick={handleDownloadKey}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: 12,
                      background: 'var(--ig-surface)',
                      border: '1px solid var(--ig-border)',
                      color: 'var(--ig-text)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Download size={16} /> Lưu file .txt
                  </button>
                </div>

                {/* Warning Card */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid var(--amber-500)',
                    fontSize: 12,
                    color: 'var(--ig-text)',
                    lineHeight: 1.4,
                    marginBottom: 16,
                  }}
                >
                  ⚠️ <strong>Quan trọng:</strong> Hãy lưu mã này ngay. Bạn sẽ không thể xem lại mã này sau khi đóng bảng!
                </div>

                {/* Close & Enter App */}
                <button
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 14,
                    background: 'var(--ig-story-gradient)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Tôi đã lưu mã an toàn — Bắt đầu đọc sách 🚀
                </button>
              </div>
            ) : (
              /* Create Account Interactive Form */
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {/* 1. Pseudonym (Bí danh) Field with Random Suggestion Button */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
                      Bí danh của bạn (Pseudonym) <span style={{ color: 'var(--rose-500)' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={getRandomPseudonym}
                      style={{
                        background: 'var(--ig-elevated)',
                        border: '1px solid var(--ig-border)',
                        color: 'var(--ig-primary-blue)',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease',
                      }}
                      title="Tạo ngẫu nhiên một bí danh thú vị"
                    >
                      <Dices size={14} /> Gợi ý ngẫu nhiên
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ig-text-muted)', fontWeight: 700, fontSize: 15 }}>
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="vidu: mot_sach_dem, ke_ngao_du"
                      value={regBiDanh}
                      onChange={(e) => setRegBiDanh(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 32px',
                        borderRadius: 12,
                        background: 'var(--ig-elevated)',
                        border: '1px solid var(--ig-border)',
                        color: 'var(--ig-text)',
                        fontSize: 14,
                        fontWeight: 600,
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ig-primary-blue)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ig-border)')}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ig-text-muted)', marginTop: 4, display: 'block' }}>
                    Chỉ gồm chữ cái, chữ số và dấu gạch dưới (3 - 30 ký tự)
                  </span>
                </div>

                {/* 2. Avatar Mood Persona Chooser */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 8, display: 'block' }}>
                    Phong cách độc giả (Avatar Persona)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {AVATAR_MOODS.map((m) => {
                      const isSelected = selectedMood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMood(m.id)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: 12,
                            background: isSelected ? 'var(--ig-elevated)' : 'var(--ig-surface)',
                            border: isSelected ? '2px solid var(--ig-primary-blue)' : '1px solid var(--ig-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{m.icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? 'var(--ig-text)' : 'var(--ig-text-muted)' }}>
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Password Field with Live Strength Feedback */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                    Mật khẩu bảo mật <span style={{ color: 'var(--rose-500)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 8 ký tự"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        borderRadius: 12,
                        background: 'var(--ig-elevated)',
                        border: '1px solid var(--ig-border)',
                        color: 'var(--ig-text)',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ig-primary-blue)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ig-border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--ig-text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--ig-text-muted)' }}>Độ bảo mật:</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: passStrength.color }}>
                          {passStrength.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, height: 4, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ flex: 1, background: passStrength.score >= 1 ? passStrength.color : 'var(--ig-border)' }} />
                        <div style={{ flex: 1, background: passStrength.score >= 2 ? passStrength.color : 'var(--ig-border)' }} />
                        <div style={{ flex: 1, background: passStrength.score >= 3 ? passStrength.color : 'var(--ig-border)' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Confirm Password Field */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                    Xác nhận mật khẩu <span style={{ color: 'var(--rose-500)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 14px',
                        borderRadius: 12,
                        background: 'var(--ig-elevated)',
                        border: regConfirmPassword && regPassword !== regConfirmPassword ? '1px solid var(--rose-500)' : '1px solid var(--ig-border)',
                        color: 'var(--ig-text)',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ig-primary-blue)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--ig-border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--ig-text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {regConfirmPassword && regPassword !== regConfirmPassword && (
                    <span style={{ fontSize: 11, color: 'var(--rose-500)', marginTop: 4, display: 'block' }}>
                      Mật khẩu nhập lại chưa khớp
                    </span>
                  )}
                </div>

                {isOwnerRegistration && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                      Khóa khởi tạo chủ sở hữu
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={ownerSetupKey}
                      onChange={(event) => setOwnerSetupKey(event.target.value)}
                      required
                      placeholder="Nhập khóa do người vận hành cung cấp"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--ig-elevated)',
                        border: '1px solid var(--ig-border)',
                        color: 'var(--ig-text)',
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <span style={{ display: 'block', marginTop: 5, fontSize: 11, color: 'var(--ig-text-muted)' }}>
                      Khóa này chỉ dùng một lần để tạo tài khoản chủ sở hữu; không chia sẻ với người khác.
                    </span>
                  </div>
                )}

                {/* Privacy Guarantee Note */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--ig-elevated)',
                    border: '1px solid var(--ig-border)',
                    fontSize: 12,
                    color: 'var(--ig-text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  <ShieldCheck size={16} style={{ color: 'var(--ig-primary-blue)', flexShrink: 0 }} />
                  <span>Sau khi tạo, hệ thống sẽ sinh <strong>Mã Khôi Phục (Recovery Key)</strong> duy nhất dành riêng cho bạn.</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !regBiDanh || !regPassword || regPassword.length < 8 || regPassword !== regConfirmPassword || (isOwnerRegistration && !ownerSetupKey)}
                  style={{
                    marginTop: 4,
                    padding: '14px',
                    borderRadius: 14,
                    background: 'var(--ig-story-gradient)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: submitting || !regBiDanh || !regPassword ? 'not-allowed' : 'pointer',
                    opacity: submitting || !regBiDanh || !regPassword || regPassword.length < 8 || regPassword !== regConfirmPassword || (isOwnerRegistration && !ownerSetupKey) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Lock size={16} />
                  {submitting ? 'Đang tạo bí danh an toàn...' : 'Tạo tài khoản novoli'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODE 2: LOGIN (ĐĂNG NHẬP)
           ═══════════════════════════════════════════════════════════ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                Bí danh (Username)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ig-text-muted)', fontWeight: 700, fontSize: 15 }}>
                  @
                </span>
                <input
                  type="text"
                  placeholder="vidu: sach_va_tra"
                  value={loginBiDanh}
                  onChange={(e) => setLoginBiDanh(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 32px',
                    borderRadius: 12,
                    background: 'var(--ig-elevated)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 14,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)' }}>
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('recover'); clearFeedback(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--amber-400)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: 12,
                    background: 'var(--ig-elevated)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--ig-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !loginBiDanh.trim() || !loginPassword}
              style={{
                marginTop: 6,
                padding: '14px',
                borderRadius: 14,
                background: 'var(--ig-story-gradient)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 15,
                cursor: submitting || !loginBiDanh.trim() || !loginPassword ? 'not-allowed' : 'pointer',
                opacity: submitting || !loginBiDanh.trim() || !loginPassword ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <LogIn size={16} />
              {submitting ? 'Đang xác thực...' : 'Đăng nhập vào novoli'}
            </button>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODE 3: RECOVERY (KHÔI PHỤC BẰNG MÃ 160-BIT)
           ═══════════════════════════════════════════════════════════ */}
        {mode === 'recover' && (
          <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--ig-text-secondary)', margin: '0 0 4px 0', lineHeight: 1.5 }}>
              Nhập bí danh và mã khôi phục (dạng <code>BKHL-XXXXXXXX-...</code>) mà hệ thống đã cấp cho bạn khi đăng ký:
            </p>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                Bí danh của bạn
              </label>
              <input
                type="text"
                placeholder="Nhập bí danh (username)"
                value={recBiDanh}
                onChange={(e) => setRecBiDanh(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--ig-elevated)',
                  border: '1px solid var(--ig-border)',
                  color: 'var(--ig-text)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                Mã khôi phục (Recovery Key)
              </label>
              <input
                type="text"
                placeholder="BKHL-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                value={recKeyInput}
                onChange={(e) => setRecKeyInput(e.target.value.trim().toUpperCase())}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--ig-elevated)',
                  border: '1px solid var(--ig-border)',
                  color: 'var(--amber-400)',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ig-text)', marginBottom: 6, display: 'block' }}>
                Mật khẩu mới (Tối thiểu 8 ký tự)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showRecPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới"
                  value={recNewPassword}
                  onChange={(e) => setRecNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: 12,
                    background: 'var(--ig-elevated)',
                    border: '1px solid var(--ig-border)',
                    color: 'var(--ig-text)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRecPassword(!showRecPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--ig-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showRecPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !recBiDanh || !recKeyInput || !recNewPassword || recNewPassword.length < 8}
              style={{
                marginTop: 6,
                padding: '14px',
                borderRadius: 14,
                background: 'var(--ig-story-gradient)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <KeyRound size={16} />
              {submitting ? 'Đang khôi phục...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MODE 4: DEMO ACCOUNTS (TRẢI NGHIỆM NHANH)
           ═══════════════════════════════════════════════════════════ */}
        {mode === 'switch' && import.meta.env.DEV && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--ig-text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Chọn tài khoản trải nghiệm đã nạp sẵn tủ sách, chuỗi streak và lịch sử đọc:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {demoAccounts.map((acc) => {
                const isCurrent = user?.biDanh === acc.biDanh;
                return (
                  <div
                    key={acc.biDanh}
                    onClick={() => {
                      switchDemoUser(acc.biDanh);
                      onClose();
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: isCurrent ? 'var(--ig-elevated)' : 'var(--ig-surface)',
                      border: isCurrent ? '2px solid var(--amber-500)' : '1px solid var(--ig-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{acc.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: isCurrent ? 'var(--amber-400)' : 'var(--ig-text)' }}>
                          @{acc.biDanh} {isCurrent && '✓ (Đang dùng)'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ig-text-secondary)', marginTop: 2 }}>{acc.role}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: 'var(--ig-elevated)',
                        color: 'var(--amber-400)',
                        border: '1px solid var(--amber-500)',
                      }}
                    >
                      🔥 {acc.streak} ngày streak
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
