import React, { useState } from 'react';
import { api } from '../services/api';
import { Thread } from '../types';
import { X, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';

interface NewThreadModalProps {
  onClose: () => void;
  onCreated: (thread: Thread) => void;
}

export const NewThreadModal: React.FC<NewThreadModalProps> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await api.createThread({
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : ['ThảoLuận'],
        hasSpoilers,
      });

      onCreated(res.thread);
      onClose();
    } catch (err) {
      alert((err as Error).message || 'Không thể tạo chủ đề');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 600,
          backgroundColor: 'var(--bg-surface)',
          padding: 26,
          borderRadius: 22,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            padding: 8,
            borderRadius: 10,
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--emerald-400)',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Mở Chủ Đề Thảo Luận Mới</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Được bảo vệ bởi mã hóa danh tính một chiều HMAC (Zero-Trace Anonymity)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
              Tiêu đề chủ đề:
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Cảm nghĩ về nhân vật Toru trong Rừng Na Uy..."
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
              Nội dung chi tiết:
            </label>
            <textarea
              rows={5}
              placeholder="Viết bài cảm nhận, phân tích triết học hoặc góc nhìn phản biện..."
              className="input-field"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
              Thẻ chủ đề (cách nhau bởi dấu phẩy):
            </label>
            <input
              type="text"
              placeholder="Murakami, TrietHoc, TamLy, KetThuc..."
              className="input-field"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--rose-400)' }}>
            <input
              type="checkbox"
              checked={hasSpoilers}
              onChange={(e) => setHasSpoilers(e.target.checked)}
            />
            <AlertTriangle size={15} /> Bài viết có tiết lộ nội dung cốt truyện (Spoiler)
          </label>

          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="btn btn-primary"
            style={{ marginTop: 8, justifyContent: 'center' }}
          >
            <Plus size={18} />
            {submitting ? 'Đang tạo chủ đề...' : 'Đăng bài ẩn danh'}
          </button>
        </form>
      </div>
    </div>
  );
};
