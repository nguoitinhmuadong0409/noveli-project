import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, MessageCircle, Plus, Send, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, getToken } from '../services/api';
import { ChatConversation, ChatMessage } from '../types';

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
const EMPTY_MESSAGES: ChatMessage[] = [];

export const ChatView: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [failedConversationId, setFailedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'direct' | 'group' | null>(null);
  const [username, setUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [newMember, setNewMember] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollContainer = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const activeMessages = selectedId ? messagesByConversation[selectedId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES;
  const loadingMessages = Boolean(selectedId && !Object.prototype.hasOwnProperty.call(messagesByConversation, selectedId) && selectedId !== failedConversationId);

  const loadConversations = useCallback(async (preferredId?: string) => {
    const result = await api.getChatConversations();
    setConversations(result.conversations);
    setSelectedId((current) => {
      if (preferredId && result.conversations.some(({ id }) => id === preferredId)) return preferredId;
      if (current && result.conversations.some(({ id }) => id === current)) return current;
      return result.conversations[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.getChatConversations()
      .then(({ conversations: loadedConversations }) => {
        if (!active) return;
        setConversations(loadedConversations);
        setSelectedId((current) => (
          current && loadedConversations.some(({ id }) => id === current)
            ? current
            : loadedConversations[0]?.id ?? null
        ));
      })
      .catch((err: Error) => {
        if (active) setError(err.message || 'Không thể tải danh sách trò chuyện.');
      });
    const token = getToken();
    if (token) {
      const socket = io(API_ORIGIN || window.location.origin, { auth: { token } });
      socketRef.current = socket;
      socket.on('chat:message', (message: ChatMessage) => {
        setMessagesByConversation((current) => {
          const currentMessages = current[message.conversationId] ?? EMPTY_MESSAGES;
          if (currentMessages.some(({ id }) => id === message.id)) return current;
          return { ...current, [message.conversationId]: [...currentMessages, message] };
        });
        setConversations((current) => current.map((conversation) => (
          conversation.id === message.conversationId
            ? { ...conversation, lastMessage: message, updatedAt: message.createdAt }
            : conversation
        )).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      });
      socket.on('connect_error', () => {
        if (active) setError('Kết nối chat thời gian thực thất bại. Hãy tải lại trang hoặc đăng nhập lại.');
      });
    }
    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user, loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.getChatMessages(selectedId)
      .then(({ messages: loadedMessages }) => {
        if (active) {
          setMessagesByConversation((current) => ({ ...current, [selectedId]: loadedMessages }));
          setFailedConversationId(null);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setFailedConversationId(selectedId);
          setError(err.message || 'Không thể tải tin nhắn.');
        }
      });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    scrollContainer.current?.scrollTo({ top: scrollContainer.current.scrollHeight, behavior: 'smooth' });
  }, [activeMessages]);

  const handleCreateConversation = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let conversationId: string;
      if (mode === 'direct') {
        ({ conversationId } = await api.createDirectConversation(username.trim()));
      } else {
        const members = groupMembers.split(',').map((member) => member.trim()).filter(Boolean);
        ({ conversationId } = await api.createGroupConversation(groupName.trim(), members));
      }
      await loadConversations(conversationId);
      setMode(null);
      setUsername('');
      setGroupName('');
      setGroupMembers('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo cuộc trò chuyện.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!selectedId || !content || busy) return;
    setBusy(true);
    setError('');
    try {
      const { message } = await api.sendChatMessage(selectedId, content);
      setMessagesByConversation((current) => {
        const currentMessages = current[selectedId] ?? EMPTY_MESSAGES;
        if (currentMessages.some(({ id }) => id === message.id)) return current;
        return { ...current, [selectedId]: [...currentMessages, message] };
      });
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi tin nhắn.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedConversation || !newMember.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addChatGroupMembers(selectedConversation.id, [newMember.trim()]);
      setNewMember('');
      await loadConversations(selectedConversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm thành viên.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <main className="chat-auth-required">
        <MessageCircle size={42} />
        <h1>Trò chuyện cùng cộng đồng</h1>
        <p>Đăng nhập để nhắn tin riêng và tạo nhóm đọc sách.</p>
        <button className="chat-primary-button" onClick={onOpenAuthModal}>Đăng nhập / Đăng ký</button>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <header className="chat-page-heading">
        <div>
          <span className="chat-eyebrow">CỘNG ĐỒNG NOVOLI</span>
          <h1>Trò chuyện</h1>
        </div>
        <div className="chat-create-actions">
          <button onClick={() => { setMode('direct'); setError(''); }}><MessageCircle size={17} /> Tin nhắn mới</button>
          <button onClick={() => { setMode('group'); setError(''); }}><Users size={17} /> Tạo nhóm</button>
        </div>
      </header>

      {error && <div className="chat-error" role="alert">{error}</div>}

      {mode && (
        <form className="chat-create-form" onSubmit={handleCreateConversation}>
          <div className="chat-create-form-heading">
            <strong>{mode === 'direct' ? 'Bắt đầu trò chuyện riêng' : 'Tạo nhóm trò chuyện'}</strong>
            <button type="button" className="chat-text-button" onClick={() => setMode(null)}>Hủy</button>
          </div>
          {mode === 'direct' ? (
            <input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tên tài khoản người nhận" minLength={3} maxLength={30} required />
          ) : (
            <>
              <input autoFocus value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Tên nhóm" minLength={2} maxLength={80} required />
              <input value={groupMembers} onChange={(event) => setGroupMembers(event.target.value)} placeholder="Tên tài khoản thành viên, cách nhau bằng dấu phẩy" />
            </>
          )}
          <button className="chat-primary-button" disabled={busy} type="submit">{busy ? 'Đang tạo…' : 'Tiếp tục'}</button>
        </form>
      )}

      <section className="chat-panel">
        <aside className={`chat-conversation-list${selectedId ? ' chat-list-mobile-hidden' : ''}`}>
          <div className="chat-list-title">
            <h2>Tin nhắn</h2>
            <span>{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="chat-empty-list">
              <MessageCircle size={28} />
              <p>Chưa có cuộc trò chuyện nào.</p>
              <button className="chat-text-button" onClick={() => setMode('direct')}>Bắt đầu nhắn tin</button>
            </div>
          ) : conversations.map((conversation) => {
            const title = conversation.name || conversation.members.filter((member) => member.id !== user.id).map((member) => member.biDanh).join(', ');
            return (
              <button
                className={`chat-conversation-item${selectedId === conversation.id ? ' selected' : ''}`}
                key={conversation.id}
                onClick={() => { setSelectedId(conversation.id); setError(''); }}
              >
                <span className="chat-avatar">{conversation.type === 'GROUP' ? <Users size={19} /> : title.charAt(0).toUpperCase()}</span>
                <span className="chat-conversation-copy">
                  <strong>{title || 'Cuộc trò chuyện'}</strong>
                  <small>{conversation.lastMessage?.content ?? (conversation.type === 'GROUP' ? `${conversation.memberCount} thành viên` : 'Bắt đầu trò chuyện')}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <div className={`chat-conversation${selectedId ? ' chat-conversation-mobile-visible' : ''}`}>
          {selectedConversation ? (
            <>
              <header className="chat-conversation-header">
                <button className="chat-back-button" onClick={() => setSelectedId(null)} aria-label="Quay lại danh sách"><ArrowLeft size={20} /></button>
                <span className="chat-avatar">{selectedConversation.type === 'GROUP' ? <Users size={19} /> : (selectedConversation.name || '?').charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{selectedConversation.name || 'Trò chuyện riêng'}</strong>
                  <small>{selectedConversation.type === 'GROUP' ? `${selectedConversation.memberCount} thành viên` : 'Trò chuyện riêng'}</small>
                </div>
              </header>
              {selectedConversation.type === 'GROUP' && selectedConversation.role === 'ADMIN' && (
                <form className="chat-add-member" onSubmit={handleAddMember}>
                  <input value={newMember} onChange={(event) => setNewMember(event.target.value)} placeholder="Tên tài khoản cần thêm" minLength={3} maxLength={30} required />
                  <button disabled={busy} type="submit"><Plus size={16} /> Thêm</button>
                </form>
              )}
              <div className="chat-messages" ref={scrollContainer}>
                {loadingMessages ? <p className="chat-loading">Đang tải tin nhắn…</p> : activeMessages.length === 0 ? (
                  <div className="chat-empty-thread"><MessageCircle size={30} /><p>Hãy gửi lời chào đầu tiên!</p></div>
                ) : activeMessages.map((message) => {
                  const isMine = message.sender.id === user.id;
                  return (
                    <div className={`chat-message-row${isMine ? ' mine' : ''}`} key={message.id}>
                      {!isMine && <span className="chat-message-sender">{message.sender.biDanh}</span>}
                      <div className="chat-message-bubble">{message.content}</div>
                      <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                  );
                })}
              </div>
              <form className="chat-compose" onSubmit={handleSendMessage}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Viết tin nhắn…" maxLength={2000} aria-label="Nội dung tin nhắn" />
                <button className="chat-send-button" disabled={!draft.trim() || busy} aria-label="Gửi tin nhắn"><Send size={18} /></button>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-icon"><MessageCircle size={34} /></div>
              <h2>Không gian trò chuyện của bạn</h2>
              <p>Chọn một cuộc trò chuyện hoặc bắt đầu kết nối với cộng đồng độc giả.</p>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .chat-page { max-width: 1150px; margin: 0 auto; padding: 38px 28px 80px; color: var(--ig-text); }
        .chat-page-heading, .chat-create-form-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
        .chat-page-heading { margin-bottom:22px; }
        .chat-page-heading h1 { font-family:var(--font-heading); font-size:30px; margin:5px 0 0; }
        .chat-eyebrow { color:var(--ig-text-secondary); font-size:11px; font-weight:800; letter-spacing:.14em; }
        .chat-create-actions { display:flex; gap:9px; }
        .chat-create-actions button, .chat-add-member button { display:flex; align-items:center; gap:7px; padding:10px 13px; border:1px solid var(--ig-border); border-radius:11px; color:var(--ig-text); background:var(--ig-surface); cursor:pointer; font-weight:650; }
        .chat-panel { display:grid; grid-template-columns:310px minmax(0,1fr); height:min(690px, calc(100vh - 190px)); min-height:440px; border:1px solid var(--ig-border); border-radius:18px; overflow:hidden; background:var(--ig-surface); }
        .chat-conversation-list { overflow-y:auto; border-right:1px solid var(--ig-border); }
        .chat-list-title { display:flex; align-items:center; gap:9px; padding:18px 17px 12px; }
        .chat-list-title h2 { font-size:15px; margin:0; }
        .chat-list-title span { font-size:11px; color:var(--ig-text-secondary); }
        .chat-conversation-item { width:100%; display:flex; align-items:center; gap:12px; padding:13px 15px; background:transparent; color:var(--ig-text); text-align:left; cursor:pointer; }
        .chat-conversation-item:hover,.chat-conversation-item.selected { background:var(--ig-elevated); }
        .chat-avatar { width:42px; height:42px; flex:none; border-radius:50%; display:grid; place-items:center; background:var(--ig-story-gradient); color:white; font-weight:800; }
        .chat-conversation-copy { min-width:0; display:grid; gap:5px; }
        .chat-conversation-copy strong,.chat-conversation-copy small { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .chat-conversation-copy strong { font-size:13px; }
        .chat-conversation-copy small { color:var(--ig-text-secondary); font-size:11px; }
        .chat-conversation { min-width:0; display:flex; flex-direction:column; }
        .chat-conversation-header { display:flex; align-items:center; gap:11px; padding:13px 18px; border-bottom:1px solid var(--ig-border); }
        .chat-conversation-header>div { display:grid; gap:4px; }
        .chat-conversation-header strong { font-size:14px; }
        .chat-conversation-header small { font-size:11px; color:var(--ig-text-secondary); }
        .chat-back-button { display:none; }
        .chat-messages { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding:20px; }
        .chat-message-row { max-width:78%; align-self:flex-start; display:flex; flex-direction:column; align-items:flex-start; gap:4px; }
        .chat-message-row.mine { align-self:flex-end; align-items:flex-end; }
        .chat-message-sender,.chat-message-row time { color:var(--ig-text-secondary); font-size:10px; padding:0 5px; }
        .chat-message-bubble { background:var(--ig-elevated); border-radius:15px 15px 15px 4px; padding:10px 13px; font-size:13px; line-height:1.5; overflow-wrap:anywhere; white-space:pre-wrap; }
        .chat-message-row.mine .chat-message-bubble { color:white; background:linear-gradient(135deg,#d94676,#8b5cf6); border-radius:15px 15px 4px 15px; }
        .chat-compose { display:flex; gap:10px; padding:13px 16px; border-top:1px solid var(--ig-border); }
        .chat-compose input,.chat-create-form input,.chat-add-member input { min-width:0; flex:1; padding:11px 13px; border:1px solid var(--ig-border); border-radius:11px; background:var(--ig-bg); color:var(--ig-text); outline:none; }
        .chat-send-button,.chat-primary-button { border:0; border-radius:11px; padding:10px 16px; color:white; background:linear-gradient(135deg,#d94676,#8b5cf6); cursor:pointer; font-weight:700; }
        .chat-send-button { display:grid; place-items:center; width:42px; }
        .chat-send-button:disabled,.chat-primary-button:disabled { opacity:.55; cursor:default; }
        .chat-create-form { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:15px; margin-bottom:14px; border:1px solid var(--ig-border); border-radius:14px; background:var(--ig-surface); }
        .chat-create-form-heading { flex-basis:100%; }
        .chat-text-button { color:var(--ig-text-secondary); background:none; border:0; cursor:pointer; }
        .chat-error { margin:0 0 12px; padding:10px 13px; border-radius:10px; color:#b42318; background:rgba(220,38,38,.09); font-size:13px; }
        .chat-empty-list,.chat-empty-thread,.chat-welcome,.chat-auth-required { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:var(--ig-text-secondary); }
        .chat-empty-list { min-height:220px; padding:20px; }
        .chat-empty-list p,.chat-empty-thread p { font-size:13px; }
        .chat-welcome { flex:1; padding:30px; }
        .chat-welcome h2,.chat-auth-required h1 { color:var(--ig-text); font-size:20px; margin:15px 0 7px; }
        .chat-welcome p,.chat-auth-required p { max-width:380px; font-size:13px; line-height:1.6; }
        .chat-welcome-icon { width:70px; height:70px; border-radius:24px; display:grid; place-items:center; color:#d94676; background:rgba(217,70,118,.1); }
        .chat-loading { margin:auto; color:var(--ig-text-secondary); font-size:13px; }
        .chat-add-member { display:flex; gap:8px; padding:10px 15px; border-bottom:1px solid var(--ig-border); }
        .chat-auth-required { min-height:65vh; padding:30px; }
        @media(max-width:700px) {
          .chat-page { padding:24px 12px 70px; }
          .chat-page-heading { align-items:flex-start; flex-direction:column; }
          .chat-page-heading h1 { font-size:26px; }
          .chat-create-actions { width:100%; }
          .chat-create-actions button { flex:1; justify-content:center; }
          .chat-panel { display:block; height:calc(100dvh - 190px); min-height:400px; }
          .chat-conversation-list,.chat-conversation { height:100%; }
          .chat-list-mobile-hidden { display:none; }
          .chat-conversation:not(.chat-conversation-mobile-visible) { display:none; }
          .chat-back-button { display:grid; place-items:center; width:34px; height:34px; border:0; border-radius:9px; color:var(--ig-text); background:var(--ig-elevated); }
          .chat-create-form input { flex-basis:100%; }
          .chat-message-row { max-width:88%; }
        }
      `}</style>
    </main>
  );
};
