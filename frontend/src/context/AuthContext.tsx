import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, clearToken, getToken } from '../services/api';

export type ThemeMode =
  | 'dark-midnight'
  | 'dark-coffee'
  | 'dark-forest'
  | 'dark-navy'
  | 'light-sepia'
  | 'light-cream'
  | 'light-matcha'
  | 'light-peach';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  login: (biDanh: string, pass: string) => Promise<void>;
  register: (biDanh: string, pass: string, ownerSetupKey?: string) => Promise<string>;
  switchDemoUser: (biDanh: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (data: { avatarSeed?: string; preferences?: Record<string, unknown> }) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  recoverPassword: (biDanh: string, recoveryKey: string, newPass: string) => Promise<void>;
  updateUserStreak: (streak: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeMode>('light-sepia');

  useEffect(() => {
    async function initAuth() {
      try {
        const storedTheme = (localStorage.getItem('novoli_theme_variant') as ThemeMode) || 'light-sepia';
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);

        // 1. Try to restore session using stored access token
        const existingToken = getToken();
        if (existingToken) {
          try {
            const meRes = await api.getMe();
            setUser(meRes.user);
            return;
          } catch {
            // Token might be expired, fallback to refresh cookie
          }
        }

        // 2. Try refreshing token via HttpOnly cookie
        const refreshed = await api.refreshToken();
        if (refreshed) {
          const meRes = await api.getMe();
          setUser(meRes.user);
          return;
        }

        if (import.meta.env.DEV) {
          try {
            const res = await api.login('sach_va_tra', 'novoli@2026!');
            setUser(res.user);
          } catch {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('[Auth] Session restoration ended:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('novoli_theme_variant', mode);
    document.documentElement.setAttribute('data-theme', mode);
  };

  const toggleTheme = () => {
    // Quick toggle between classic reading Sepia (Giấy cổ điển) and Dark Coffee (Espresso)
    const newTheme: ThemeMode = theme === 'light-sepia' ? 'dark-coffee' : 'light-sepia';
    setThemeMode(newTheme);
  };

  const login = async (biDanh: string, pass: string) => {
    const res = await api.login(biDanh, pass);
    setUser(res.user);
  };

  const register = async (biDanh: string, pass: string, ownerSetupKey?: string) => {
    const res = await api.register(biDanh, pass, ownerSetupKey);
    setUser(res.user);
    return res.recoveryKey;
  };

  const switchDemoUser = async (biDanh: string) => {
    setLoading(true);
    try {
      const res = await api.login(biDanh, 'novoli@2026!');
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    clearToken();
    setUser(null);
  };

  const logoutAll = async () => {
    await api.logoutAll();
    clearToken();
    setUser(null);
  };

  const updateProfile = async (data: { avatarSeed?: string; preferences?: Record<string, unknown> }) => {
    const res = await api.updateMe(data);
    setUser(res.user);
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    await api.changePassword(currentPass, newPass);
  };

  const recoverPassword = async (biDanh: string, recKey: string, newPass: string) => {
    await api.recoverPassword(biDanh, recKey, newPass);
  };

  const updateUserStreak = (streak: number) => {
    setUser((prev) => (prev ? { ...prev, currentStreak: streak } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        setThemeMode,
        toggleTheme,
        login,
        register,
        switchDemoUser,
        logout,
        logoutAll,
        updateProfile,
        changePassword,
        recoverPassword,
        updateUserStreak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
