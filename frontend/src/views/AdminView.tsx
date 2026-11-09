import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, MessageSquare, RefreshCw, Shield, Star, Users } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdminBookManager } from '../components/AdminBookManager';

type AdminDashboardData = Awaited<ReturnType<typeof api.getAdminDashboard>>;
type AdminAccount = AdminDashboardData['users'][number];

const statCards = [
  { key: 'totalUsers', label: 'Tài khoản', icon: Users },
  { key: 'totalAdmins', label: 'Quản trị viên', icon: Shield },
  { key: 'totalBooks', label: 'Đầu sách', icon: BookOpen },
  { key: 'totalReviews', label: 'Đánh giá', icon: Star },
  { key: 'totalThreads', label: 'Chủ đề diễn đàn', icon: MessageSquare },
  { key: 'totalPosts', label: 'Bài đăng diễn đàn', icon: MessageSquare },
] as const;

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await api.getAdminDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const changeRole = async (target: AdminAccount) => {
    const nextRole = target.role === 'admin' ? 'user' : 'admin';
    const confirmed = window.confirm(
      nextRole === 'admin'
        ? `Cấp quyền quản trị cho @${target.biDanh}?`
        : `Gỡ quyền quản trị của @${target.biDanh}?`,
    );
    if (!confirmed) return;

    setSavingUserId(target.id);
    setError(null);
    try {
      await api.updateUserRole(target.id, nextRole);
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật quyền tài khoản.');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <section style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 24px 80px', color: 'var(--ig-text)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={25} color="var(--ig-accent, #c2410c)" />
            <h1 style={{ margin: 0, fontSize: 28 }}>Quản trị Novoli</h1>
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--ig-text-secondary)' }}>
            Xin chào @{user?.biDanh}. Quản lý tài khoản và theo dõi hoạt động ứng dụng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          aria-label="Làm mới dữ liệu"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 9,
            border: '1px solid var(--ig-border)',
            background: 'var(--ig-surface)',
            color: 'var(--ig-text)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            marginBottom: 20,
            borderRadius: 10,
            color: '#b91c1c',
            background: 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading && !dashboard ? (
        <p role="status">Đang tải dữ liệu quản trị...</p>
      ) : dashboard ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              marginBottom: 32,
            }}
          >
            {statCards.map(({ key, label, icon: Icon }) => (
              <article
                key={key}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  border: '1px solid var(--ig-border)',
                  background: 'var(--ig-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ig-text-secondary)' }}>
                  <Icon size={17} /> <span>{label}</span>
                </div>
                <strong style={{ display: 'block', marginTop: 12, fontSize: 26 }}>{dashboard.stats[key]}</strong>
              </article>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Quản lý tài khoản</h2>
            <span style={{ color: 'var(--ig-text-secondary)', fontSize: 13 }}>
              {dashboard.isOwner ? 'Chỉ chủ sở hữu mới có thể cấp hoặc thu hồi quyền admin.' : 'Chỉ xem được danh sách; quyền admin do chủ sở hữu quản lý.'}
            </span>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--ig-border)', borderRadius: 12, marginBottom: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650, background: 'var(--ig-surface)' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--ig-text-secondary)', fontSize: 13 }}>
                  <th style={{ padding: '14px 16px' }}>Tài khoản</th>
                  <th style={{ padding: '14px 16px' }}>Vai trò</th>
                  <th style={{ padding: '14px 16px' }}>Chuỗi đọc</th>
                  <th style={{ padding: '14px 16px' }}>Ngày tạo</th>
                  {dashboard.isOwner && <th style={{ padding: '14px 16px' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {dashboard.users.map((account) => {
                  const isSelf = account.id === user?.id;
                  return (
                    <tr key={account.id} style={{ borderTop: '1px solid var(--ig-border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>@{account.biDanh}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 9px',
                            borderRadius: 999,
                            color: account.role === 'admin' ? '#9a3412' : 'var(--ig-text-secondary)',
                            background: account.role === 'admin' ? 'rgba(249, 115, 22, 0.14)' : 'var(--ig-elevated)',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {account.role === 'admin' ? 'Admin' : 'Người dùng'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{account.currentStreak} ngày</td>
                      <td style={{ padding: '14px 16px' }}>
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      {dashboard.isOwner && (
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            type="button"
                            disabled={isSelf || savingUserId === account.id}
                            onClick={() => void changeRole(account)}
                            title={isSelf ? 'Không thể thay đổi quyền của chính mình' : undefined}
                            style={{
                              padding: '7px 10px',
                              borderRadius: 8,
                              border: '1px solid var(--ig-border)',
                              background: 'var(--ig-elevated)',
                              color: 'var(--ig-text)',
                              cursor: isSelf || savingUserId === account.id ? 'not-allowed' : 'pointer',
                              opacity: isSelf || savingUserId === account.id ? 0.55 : 1,
                            }}
                          >
                            {savingUserId === account.id ? 'Đang lưu...' : account.role === 'admin' ? 'Gỡ admin' : 'Cấp admin'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <AdminBookManager onChanged={() => void loadDashboard()} />
        </>
      ) : null}
    </section>
  );
};
