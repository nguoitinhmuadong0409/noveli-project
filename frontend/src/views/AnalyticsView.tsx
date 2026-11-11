import React, { useMemo } from 'react';
import { Flame, Target, BookOpen, Clock, Calendar, Sparkles, Plus } from 'lucide-react';
import { ReadingChartPoint } from '../types'; // Đảm bảo import type phù hợp với project của Thầy

// Cập nhật Props để nhận trực tiếp dữ liệu từ frontend
interface AnalyticsViewProps {
  onOpenLogModal: () => void;
  books?: any[]; // Mảng dữ liệu Kệ sách truyền từ component cha
  chartData?: ReadingChartPoint[]; // Mảng dữ liệu biểu đồ 7 ngày (nếu có)
  userStats?: { // Các chỉ số phụ truyền từ ngoài vào (chuỗi streak, thống kê 30 ngày)
    currentStreak?: number;
    longestStreak?: number;
    last30Days?: {
      pagesRead: number;
      minutesRead: number;
      sessionsCount: number;
    };
  };
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  onOpenLogModal, 
  books = [], 
  chartData = [],
  userStats
}) => {

  // 1. Tính toán trực tiếp số liệu "Mục Tiêu Năm 2026" từ Kệ sách
  const goalStats = useMemo(() => {
    const targetBooks = 24; 
    const targetPages = 6000;

    // Đếm số sách đã hoàn thành (tiến độ = 100%)
    const completedBooks = books.filter((book) => book.progress === 100).length; 
    
    // Cộng tổng số trang đã đọc của tất cả các cuốn sách trên kệ
    const completedPages = books.reduce((total, book) => total + (Number(book.pagesRead) || 0), 0);

    return { targetBooks, targetPages, completedBooks, completedPages };
  }, [books]);

  // 2. Tính phần trăm tiến độ
  const bookProgressPercent = Math.min(100, Math.round((goalStats.completedBooks / goalStats.targetBooks) * 100)) || 0;
  const pageProgressPercent = Math.min(100, Math.round((goalStats.completedPages / goalStats.targetPages) * 100)) || 0;

  // 3. Tính max pages cho biểu đồ cột
  const maxPages = chartData.length > 0 ? Math.max(...chartData.map((c) => c.pages), 40) : 40;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Title & Quick Log CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Thống Kê & Chuỗi Streak</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Theo dõi kỷ luật đọc sách mỗi ngày và thử thách năm 2026
          </p>
        </div>
        <button onClick={onOpenLogModal} className="btn btn-primary">
          <Plus size={16} /> Ghi nhận trang sách
        </button>
      </div>

      {/* Grid: Streak Card & 30-Day Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
        {/* Streak Highlight Card */}
        <div
          className="glass-panel"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), var(--bg-surface) 80%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-400)', textTransform: 'uppercase' }}>
              Chuỗi đọc liên tiếp
            </span>
            <div className="animate-streak-fire">
              <Flame size={28} fill="var(--amber-400)" color="var(--amber-500)" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {userStats?.currentStreak || 7}
            </span>
            <span style={{ fontSize: 18, color: 'var(--amber-400)', fontWeight: 700 }}>
              ngày liên tiếp
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            Kỷ lục dài nhất: <strong>{userStats?.longestStreak || 21} ngày</strong>. Đọc ít nhất 10 trang hôm nay để duy trì chuỗi!
          </p>
        </div>

        {/* 30-Day Totals */}
        <div className="card" style={{ padding: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, display: 'block' }}>
            Tổng kết 30 ngày qua
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--emerald-400)', marginBottom: 4 }}>
                <BookOpen size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Trang đã đọc</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {userStats?.last30Days?.pagesRead || 210} trang
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--indigo-400)', marginBottom: 4 }}>
                <Clock size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Thời gian đọc</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {userStats?.last30Days?.minutesRead ? Math.round(userStats.last30Days.minutesRead / 60) : 4} giờ
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
            Đã hoàn thành <strong>{userStats?.last30Days?.sessionsCount || 7}</strong> phiên đọc sách tập trung.
          </div>
        </div>
      </div>

      {/* 2026 Yearly Reading Challenge Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--indigo-400)' }}>
              <Target size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Mục Tiêu Đọc Sách Năm 2026</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thử thách hoàn thành {goalStats.targetBooks} cuốn sách</p>
            </div>
          </div>
          <span className="badge badge-emerald">
            <Sparkles size={12} /> Tiến độ: {bookProgressPercent}%
          </span>
        </div>

        {/* Book progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <span>Số lượng sách:</span>
            <span>{goalStats.completedBooks} / {goalStats.targetBooks} cuốn</span>
          </div>
          <div style={{ height: 10, borderRadius: 9999, background: 'var(--bg-surface-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${bookProgressPercent}%`,
                background: 'linear-gradient(90deg, var(--indigo-500), var(--emerald-400))',
                borderRadius: 9999,
              }}
            />
          </div>
        </div>

        {/* Page progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <span>Khối lượng trang:</span>
            <span>{goalStats.completedPages} / {goalStats.targetPages} trang ({pageProgressPercent}%)</span>
          </div>
          <div style={{ height: 10, borderRadius: 9999, background: 'var(--bg-surface-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pageProgressPercent}%`,
                background: 'linear-gradient(90deg, var(--amber-500), #e11d48)',
                borderRadius: 9999,
              }}
            />
          </div>
        </div>
      </div>

      {/* 7-Day Reading Timeline Bar Chart */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Calendar size={18} color="var(--amber-400)" />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Biểu Đồ Đọc 7 Ngày Gần Nhất</h3>
        </div>

        {chartData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu phiên đọc trong 7 ngày qua.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 180, paddingTop: 20, gap: 12 }}>
            {chartData.map((point) => {
              const heightPercent = Math.max(12, Math.round((point.pages / maxPages) * 100));
              const dateLabel = new Date(point.date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' });

              return (
                <div
                  key={point.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber-400)' }}>
                    {point.pages > 0 ? `${point.pages} tr` : '0'}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 42,
                      height: `${heightPercent}%`,
                      background: point.pages > 0
                        ? 'linear-gradient(180deg, var(--amber-400), var(--amber-600))'
                        : 'var(--bg-surface-elevated)',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 400ms ease-out',
                      boxShadow: point.pages > 0 ? '0 4px 12px var(--amber-glow)' : 'none',
                    }}
                    title={`${point.date}: ${point.pages} trang (${point.minutes} phút)`}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
