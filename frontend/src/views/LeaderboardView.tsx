import React, { useEffect, useState } from 'react';
import { Award, BookOpen, CalendarDays, Clock3, Crown, Medal, Trophy } from 'lucide-react';
import { api } from '../services/api';
import { LeaderboardEntry } from '../types';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function getRankIcon(rank: number) {
  if (rank === 1) return Crown;
  if (rank === 2) return Medal;
  if (rank === 3) return Award;
  return null;
}

function formatReadingTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} phút`;
  if (remainingMinutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainingMinutes} phút`;
}

export const LeaderboardView: React.FC = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.getLeaderboard(month, year)
      .then((response) => {
        if (active) setEntries(response.leaderboard);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, year]);

  const periodLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 20px 96px' }}>
      <section
        style={{
          padding: 'clamp(22px, 5vw, 40px)',
          borderRadius: 24,
          background: 'linear-gradient(135deg, var(--ig-surface), var(--ig-elevated))',
          border: '1px solid var(--ig-border)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--amber-400)', marginBottom: 10 }}>
              <Trophy size={21} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Cộng đồng Noveli</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 38px)', lineHeight: 1.15, marginBottom: 10 }}>
              Bảng xếp hạng
            </h1>
            <p style={{ color: 'var(--ig-text-secondary)', fontSize: 15 }}>
              Vinh danh những độc giả chăm chỉ nhất. Thứ hạng dựa trên tổng số trang đã ghi nhận trong tháng.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, background: 'var(--ig-surface)', border: '1px solid var(--ig-border)' }}>
            <CalendarDays size={18} color="var(--amber-400)" />
            <label>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ig-text-muted)', fontWeight: 700, marginBottom: 3 }}>THÁNG</span>
              <select
                aria-label="Chọn tháng xếp hạng"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                style={{ color: 'var(--ig-text)', background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                {MONTHS.map((value) => (
                  <option key={value} value={value} disabled={year === today.getUTCFullYear() && value > today.getUTCMonth() + 1}>
                    Tháng {value}
                  </option>
                ))}
              </select>
            </label>
            <span style={{ width: 1, height: 30, background: 'var(--ig-border)' }} />
            <label>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ig-text-muted)', fontWeight: 700, marginBottom: 3 }}>NĂM</span>
              <select
                aria-label="Chọn năm xếp hạng"
                value={year}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setYear(nextYear);
                  if (nextYear === today.getUTCFullYear() && month > today.getUTCMonth() + 1) {
                    setMonth(today.getUTCMonth() + 1);
                  }
                }}
                style={{ color: 'var(--ig-text)', background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                {Array.from({ length: Math.max(1, today.getUTCFullYear() - 2019) }, (_, index) => today.getUTCFullYear() - index).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="leaderboard-card" style={{ background: 'var(--ig-surface)', border: '1px solid var(--ig-border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ig-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, textTransform: 'capitalize' }}>{periodLabel}</h2>
            <p style={{ fontSize: 13, color: 'var(--ig-text-muted)', marginTop: 2 }}>Độc giả nổi bật trong tháng</p>
          </div>
          {!loading && !error && (
            <span style={{ borderRadius: 999, padding: '6px 11px', background: 'var(--ig-elevated)', color: 'var(--ig-text-secondary)', fontSize: 12, fontWeight: 700 }}>
              {entries.length} độc giả
            </span>
          )}
        </div>

        {loading ? (
          <div role="status" style={{ padding: 48, textAlign: 'center', color: 'var(--ig-text-muted)' }}>Đang tải bảng xếp hạng...</div>
        ) : error ? (
          <div role="alert" style={{ padding: 36, textAlign: 'center', color: 'var(--rose-500)' }}>{error}</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: 'var(--ig-elevated)', color: 'var(--amber-400)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <BookOpen size={27} />
            </div>
            <h3 style={{ fontSize: 17, marginBottom: 5 }}>Chưa có lượt đọc nào</h3>
            <p style={{ color: 'var(--ig-text-muted)' }}>Hãy ghi nhật ký đọc sách để góp mặt trên bảng xếp hạng nhé.</p>
          </div>
        ) : (
          <ol style={{ listStyle: 'none' }}>
            {entries.map((entry) => {
              const RankIcon = getRankIcon(entry.rank);
              const rankColor = entry.rank === 1 ? '#d99b18' : entry.rank === 2 ? '#8291a3' : '#b66b3b';

              return (
                <li
                  key={entry.biDanh}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--ig-border-subtle)',
                    background: entry.rank === 1 ? 'linear-gradient(90deg, rgba(217, 155, 24, 0.1), transparent 70%)' : 'transparent',
                  }}
                >
                  <div
                    aria-label={`Hạng ${entry.rank}`}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: RankIcon ? `${rankColor}20` : 'var(--ig-elevated)',
                      color: RankIcon ? rankColor : 'var(--ig-text-secondary)',
                      fontSize: 15,
                      fontWeight: 800,
                    }}
                  >
                    {RankIcon ? <RankIcon size={21} fill={entry.rank === 1 ? rankColor : 'none'} /> : entry.rank}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--ig-story-gradient)', color: '#fff', fontSize: 14, fontWeight: 800 }}>
                        {entry.biDanh.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.rank <= 3 && <span style={{ color: rankColor, marginRight: 6 }}>Top {entry.rank}</span>}
                          @{entry.biDanh}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 3, color: 'var(--ig-text-muted)', fontSize: 12 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><BookOpen size={13} /> {entry.booksRead} đầu sách</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock3 size={13} /> {formatReadingTime(entry.minutesRead)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: entry.rank === 1 ? 'var(--amber-400)' : 'var(--ig-text)' }}>
                      {entry.pagesRead.toLocaleString('vi-VN')}
                    </div>
                    <div style={{ color: 'var(--ig-text-muted)', fontSize: 11, fontWeight: 600 }}>trang đọc</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
};
