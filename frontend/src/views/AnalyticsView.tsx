import React, { useCallback, useEffect, useState } from 'react';
import { Flame, BookOpen, Clock, Target, Plus, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardStats, ShelfItem } from '../types';

interface AnalyticsViewProps {
  onOpenLogModal: () => void;
}

const DEFAULT_TARGET_BOOKS = 24;
const DEFAULT_TARGET_PAGES = 6000;

function percent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} giờ`;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenLogModal }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [shelves, setShelves] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, shelfRes] = await Promise.all([api.getDashboard(), api.getUserShelves()]);
      setDashboard(dash);
      setShelves(shelfRes.shelves || []);
    } catch (err) {
      setError((err as Error).message || 'Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ig-text-muted)' }}>
        Hãy đăng nhập để xem thống kê đọc sách của bạn.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ig-text-muted)' }}>
        Đang tải thống kê...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#b91c1c' }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => void load()} className="btn btn-secondary btn-sm">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Số liệu từ Kệ sách ─────────────────────────────────
  const finishedShelves = shelves.filter((s) => s.type === 'READ');
  const readingShelves = shelves.filter((s) => s.type === 'CURRENTLY_READING');

  const booksDone = finishedShelves.length;
  const pagesDone =
    finishedShelves.reduce((sum, s) => sum + (s.book.pageCount ?? s.currentPage), 0) +
    readingShelves.reduce((sum, s) => sum + s.currentPage, 0);

  const targetBooks = dashboard?.goal?.targetBooks ?? DEFAULT_TARGET_BOOKS;
  const targetPages = dashboard?.goal?.targetPages ?? DEFAULT_TARGET_PAGES;
  const booksPct = percent(booksDone, targetBooks);
  const pagesPct = percent(pagesDone, targetPages);

  // ── Số liệu từ tài khoản và các lần ghi nhận trang ─────
  const streak = dashboard?.user?.currentStreak ?? user.currentStreak ?? 0;
  const longest = Math.max(dashboard?.user?.longestStreak ?? 0, user.longestStreak ?? 0, streak);
  const last30 = dashboard?.last30Days ?? { pagesRead: 0, minutesRead: 0, sessionsCount: 0 };
  const year = new Date().getFullYear();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ig-text)', margin: 0 }}>
            Thống Kê & Chuỗi Streak
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ig-text-secondary)', margin: '6px 0 0' }}>
            Theo dõi kỷ luật đọc sách mỗi ngày và thử thách năm {year}
          </p>
        </div>
        <button onClick={onOpenLogModal} className="btn btn-primary btn-sm">
          <Plus size={16} /> Ghi nhận trang sách
        </button>
      </div>

      {/* Streak + 30 ngày */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), var(--ig-surface) 80%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.03em',
              color: 'var(--emerald-400)',
            }}
          >
            <span>CHUỖI ĐỌC LIÊN TIẾP</span>
            <Flame size={26} fill="var(--emerald-400)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 12px' }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: 'var(--ig-text)', lineHeight: 1 }}>
              {streak}
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald-400)' }}>
              ngày liên tiếp
            </span>
          </div>

          <p style={{ fontSize: 14, color: 'var(--ig-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Kỷ lục dài nhất: <strong style={{ color: 'var(--ig-text)' }}>{longest} ngày</strong>.{' '}
            {streak > 0
              ? 'Ghi nhận trang sách hôm nay để duy trì chuỗi!'
              : 'Ghi nhận trang sách hôm nay để bắt đầu chuỗi đọc.'}
          </p>
        </div>

        <div style={{ padding: '8px 4px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.03em',
              color: 'var(--ig-text-secondary)',
              marginBottom: 16,
            }}
          >
            TỔNG KẾT 30 NGÀY QUA
          </div>

          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--emerald-400)',
                  marginBottom: 6,
                }}
              >
                <BookOpen size={16} /> Trang đã đọc
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ig-text)' }}>
                {last30.pagesRead} trang
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#818cf8',
                  marginBottom: 6,
                }}
              >
                <Clock size={16} /> Thời gian đọc
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ig-text)' }}>
                {formatReadingTime(last30.minutesRead)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid var(--ig-border)',
              fontSize: 13,
              color: 'var(--ig-text-secondary)',
            }}
          >
            Đã hoàn thành <strong style={{ color: 'var(--ig-text)' }}>{last30.sessionsCount}</strong>{' '}
            phiên đọc sách tập trung.
          </div>
        </div>
      </div>

      {/* Mục tiêu năm */}
      <div style={{ padding: '0 8px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(129, 140, 248, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <Target size={24} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ig-text)' }}>
                Mục Tiêu Đọc Sách Năm {year}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ig-text-secondary)' }}>
                Thử thách hoàn thành {targetBooks} cuốn sách
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--emerald-400)',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
            }}
          >
            <Sparkles size={13} /> Tiến độ: {booksPct}%
          </span>
        </div>

        {/* Số lượng sách */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ig-text)',
              marginBottom: 8,
            }}
          >
            <span>Số lượng sách:</span>
            <span>
              {booksDone} / {targetBooks} cuốn
            </span>
          </div>
          <div style={{ height: 12, borderRadius: 9999, backgroundColor: 'var(--ig-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${booksPct}%`,
                borderRadius: 9999,
                background: 'linear-gradient(90deg, #6366f1, #34d399)',
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>

        {/* Khối lượng trang */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ig-text)',
              marginBottom: 8,
            }}
          >
            <span>Khối lượng trang:</span>
            <span>
              {pagesDone} / {targetPages} trang ({pagesPct}%)
            </span>
          </div>
          <div style={{ height: 12, borderRadius: 9999, backgroundColor: 'var(--ig-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pagesPct}%`,
                borderRadius: 9999,
                background: 'linear-gradient(90deg, #166534, #e11d48)',
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
