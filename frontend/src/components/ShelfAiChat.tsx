import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { api, AiChatMessage } from '../services/api';

interface ShelfAiChatProps {
  messages: AiChatMessage[];
  onChange: (messages: AiChatMessage[]) => void;
}

const SUGGESTIONS = [
  'Gợi ý cho mình cuốn tiếp theo dựa trên kệ sách của mình',
  'Mình nên đọc cuốn nào trong mục Muốn đọc trước?',
  'Tóm tắt giúp mình ý chính của cuốn mình đang đọc',
  'Làm sao để duy trì thói quen đọc sách mỗi ngày?',
];

const MAX_SENT_MESSAGES = 12; // chỉ gửi các tin gần nhất để tiết kiệm và tránh quá dài

export const ShelfAiChat: React.FC<ShelfAiChatProps> = ({ messages, onChange }) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    const next: AiChatMessage[] = [...messages, { role: 'user', content }];
    onChange(next);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await api.chatWithAI(next.slice(-MAX_SENT_MESSAGES));
      onChange([...next, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError((err as Error).message || 'Không gửi được tin nhắn, hãy thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '62vh',
        minHeight: 420,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Thanh tiêu đề */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <Sparkles size={18} color="var(--amber-400)" /> Trò chuyện với trợ lý đọc sách AI
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              onChange([]);
              setError(null);
            }}
            title="Xóa cuộc trò chuyện"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={15} /> Xóa
          </button>
        )}
      </div>

      {/* Danh sách tin nhắn */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Hỏi mình về sách bạn đang đọc, muốn đọc hoặc đã đọc. Trợ lý biết các cuốn trên kệ của bạn.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void send(s)}
                  style={{ maxWidth: 440, whiteSpace: 'normal', textAlign: 'left' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '82%',
                  padding: '9px 14px',
                  borderRadius: 16,
                  fontSize: 14,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: isUser ? 'var(--amber-500)' : 'var(--bg-surface-elevated)',
                  color: isUser ? '#0b0f17' : 'var(--text-primary, inherit)',
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Trợ lý đang trả lời...</div>
        )}
        {error && (
          <div role="alert" style={{ fontSize: 13, color: '#b91c1c' }}>
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Ô nhập */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          padding: 12,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu hỏi về sách... (Enter để gửi, Shift+Enter xuống dòng)"
          rows={2}
          maxLength={1000}
          className="input-field"
          style={{ flex: 1, resize: 'none' }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          aria-label="Gửi"
          style={{ height: 44 }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
