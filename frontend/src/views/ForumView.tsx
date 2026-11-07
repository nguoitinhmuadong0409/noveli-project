import React, { useState, useEffect } from 'react';
import { Thread } from '../types';
import { api } from '../services/api';
import { ThreadDetailModal } from '../components/ThreadDetailModal';
import { NewThreadModal } from '../components/NewThreadModal';
import { ShieldCheck, MessageSquare, Plus, AlertTriangle, Eye, ThumbsUp, BookOpen } from 'lucide-react';

export const ForumView: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [openNewThreadModal, setOpenNewThreadModal] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('Tất cả');

  const availableTags = ['Tất cả', '1984', 'RừngNaUy', 'TriếtHọc', 'TâmLý', 'Spoiler'];

  const loadThreads = async () => {
    setLoading(true);
    try {
      const data = await api.getThreads();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const filteredThreads = threads.filter((t) => {
    if (filterTag === 'Tất cả') return true;
    if (filterTag === 'Spoiler') return t.hasSpoilers;
    return t.tags?.includes(filterTag);
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Privacy Pledge Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), var(--bg-surface) 80%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--emerald-400)', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            <ShieldCheck size={18} /> DIỄN ĐÀN ẨN DANH BẢO MẬT TUYỆT ĐỐI (ZERO-TRACKING)
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Tự do tranh luận văn chương không lo phán xét
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Không liên kết tài khoản thực, không ghi nhật ký IP. Danh tính hiển thị được tạo ngẫu nhiên từ khóa băm HMAC một chiều cho mỗi cuốn sách.
          </p>
        </div>

        <button
          onClick={() => setOpenNewThreadModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Mở chủ đề mới
        </button>
      </div>

      {/* Filter Tags */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
        {availableTags.map((tag) => {
          const isSelected = filterTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: isSelected ? 'var(--amber-500)' : 'var(--bg-surface)',
                color: isSelected ? '#0b0f17' : 'var(--text-secondary)',
                border: isSelected ? '1px solid var(--amber-500)' : '1px solid var(--border-subtle)',
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Threads List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải các chủ đề thảo luận...
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <MessageSquare size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Chưa có bài thảo luận nào</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Hãy là người tiên phong khởi xướng góc nhìn mới!
          </p>
          <button onClick={() => setOpenNewThreadModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Tạo chủ đề ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className="card card-interactive"
              style={{
                padding: 20,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
              onClick={() => setSelectedThread(thread)}
            >
              {/* Top metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {thread.book && (
                    <span className="badge badge-amber" style={{ fontSize: 11 }}>
                      <BookOpen size={11} /> {thread.book.title}
                    </span>
                  )}
                  {thread.tags?.map((t) => (
                    <span key={t} className="badge badge-indigo" style={{ fontSize: 11 }}>
                      #{t}
                    </span>
                  ))}
                  {thread.hasSpoilers && (
                    <span className="badge badge-rose" style={{ fontSize: 11 }}>
                      <AlertTriangle size={11} /> Spoiler
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(thread.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {thread.title}
              </h3>

              {/* Bottom stats & author */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--emerald-400)', fontWeight: 600 }}>
                  <ShieldCheck size={15} />
                  <span>{thread.displayAlias}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> {thread.viewsCount}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber-400)', fontWeight: 600 }}>
                    <MessageSquare size={13} /> {thread.postsCount} phản hồi
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedThread && (
        <ThreadDetailModal
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}

      {openNewThreadModal && (
        <NewThreadModal
          onClose={() => setOpenNewThreadModal(false)}
          onCreated={(newThread) => {
            setThreads((prev) => [newThread, ...prev]);
            setSelectedThread(newThread);
          }}
        />
      )}
    </div>
  );
};
