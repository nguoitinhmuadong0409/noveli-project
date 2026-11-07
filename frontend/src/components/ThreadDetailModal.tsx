import React, { useState, useEffect } from 'react';
import { Thread, Post } from '../types';
import { api } from '../services/api';
import { X, ShieldCheck, AlertTriangle, Send, ThumbsUp, MessageSquare, BookOpen } from 'lucide-react';

interface ThreadDetailModalProps {
  thread: Thread;
  onClose: () => void;
}

export const ThreadDetailModal: React.FC<ThreadDetailModalProps> = ({ thread, onClose }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState('');
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        const data = await api.getThreadPosts(thread.id);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    }
    loadPosts();
  }, [thread.id]);

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.createPost({
        threadId: thread.id,
        content: replyContent.trim(),
        hasSpoilers,
        parentPostId: replyingToPostId || undefined,
      });

      if (replyingToPostId) {
        // Nested reply
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === replyingToPostId) {
              return { ...p, replies: [...(p.replies || []), res.post] };
            }
            return p;
          })
        );
      } else {
        setPosts((prev) => [...prev, res.post]);
      }

      setReplyContent('');
      setReplyingToPostId(null);
    } catch (err) {
      alert((err as Error).message || 'Không thể gửi phản hồi');
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
          maxWidth: 780,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          padding: 28,
          borderRadius: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            padding: 8,
            borderRadius: 12,
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Tags & Book relation badge */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {thread.book && (
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <BookOpen size={12} /> {thread.book.title}
            </span>
          )}
          {thread.tags?.map((t) => (
            <span key={t} className="badge badge-indigo">
              #{t}
            </span>
          ))}
          {thread.hasSpoilers && (
            <span className="badge badge-rose">
              <AlertTriangle size={12} /> Tiết lộ nội dung
            </span>
          )}
        </div>

        {/* Thread Title */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {thread.title}
        </h2>

        {/* Author info (Privacy-First HMAC Alias) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--emerald-400)' }}>
              {thread.displayAlias}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Tác giả bài viết (Mã hóa ẩn danh tuyệt đối) • {new Date(thread.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Original Thread Content */}
        {thread.content && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 24,
            }}
          >
            {thread.hasSpoilers && !revealedSpoilers['thread-content'] ? (
              <div
                onClick={() => toggleSpoiler('thread-content')}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px dashed rgba(244, 63, 94, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--rose-400)',
                }}
              >
                <AlertTriangle size={18} />
                <span>Nội dung bài viết chứa chi tiết cốt truyện (Spoiler). Nhấp để mở khóa đọc.</span>
              </div>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {thread.content}
              </p>
            )}
          </div>
        )}

        {/* Discussion / Replies */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={18} color="var(--amber-400)" />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>
              Thảo luận cộng đồng ({posts.length})
            </h3>
          </div>

          {loadingPosts ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải bình luận...</p>
          ) : posts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có phản hồi nào. Hãy là người mở lời tranh luận!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: post.isOp ? 'var(--amber-400)' : 'var(--emerald-400)' }}>
                        {post.displayAlias}
                      </span>
                      {post.isOp && (
                        <span className="badge badge-amber" style={{ fontSize: 10, padding: '2px 6px' }}>
                          Chủ Topic (OP)
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {post.hasSpoilers && (
                        <span className="badge badge-rose" style={{ fontSize: 10 }}>
                          Spoiler
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <ThumbsUp size={12} /> {post.upvotes}
                      </div>
                    </div>
                  </div>

                  {/* Post content */}
                  {post.hasSpoilers && !revealedSpoilers[post.id] ? (
                    <div
                      onClick={() => toggleSpoiler(post.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(244, 63, 94, 0.08)',
                        cursor: 'pointer',
                        color: 'var(--rose-400)',
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={13} /> Spoiler • Nhấp để xem
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {post.content}
                    </p>
                  )}

                  <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setReplyingToPostId(replyingToPostId === post.id ? null : post.id)}
                      style={{ fontSize: 12, color: 'var(--amber-400)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {replyingToPostId === post.id ? 'Hủy trả lời' : 'Trả lời'}
                    </button>
                  </div>

                  {/* Nested Replies */}
                  {post.replies && post.replies.length > 0 && (
                    <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--border-hover)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {post.replies.map((reply) => (
                        <div key={reply.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: reply.isOp ? 'var(--amber-400)' : 'var(--emerald-400)' }}>
                              {reply.displayAlias}
                            </span>
                            {reply.isOp && (
                              <span className="badge badge-amber" style={{ fontSize: 9 }}>
                                OP
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reply Form */}
          <form onSubmit={handleCreatePost} style={{ marginTop: 20 }}>
            {replyingToPostId && (
              <div style={{ fontSize: 12, color: 'var(--amber-400)', marginBottom: 6 }}>
                ↳ Đang trả lời bình luận cấp 2
              </div>
            )}
            <textarea
              className="input-field"
              rows={3}
              placeholder="Viết phản hồi ẩn danh..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--rose-400)' }}>
                <input
                  type="checkbox"
                  checked={hasSpoilers}
                  onChange={(e) => setHasSpoilers(e.target.checked)}
                />
                <AlertTriangle size={13} /> Bình luận có spoiler
              </label>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} />
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
