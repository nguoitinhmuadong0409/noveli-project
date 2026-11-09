import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, Clock, ExternalLink, X } from 'lucide-react';
import { Book, ShelfType } from '../types';
import { api } from '../services/api';

interface BookReaderModalProps {
  book: Book;
  onClose: () => void;
  onShelfChanged?: (bookId: string, type: ShelfType) => void;
}

const shelfButtons: { type: ShelfType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { type: 'CURRENTLY_READING', label: 'Đang đọc', icon: BookOpen },
  { type: 'WANT_TO_READ', label: 'Muốn đọc', icon: Clock },
  { type: 'READ', label: 'Đã hoàn thành', icon: CheckCircle },
];

export const BookReaderModal: React.FC<BookReaderModalProps> = ({ book, onClose, onShelfChanged }) => {
  const [saving, setSaving] = useState<ShelfType | null>(null);
  const [savedType, setSavedType] = useState<ShelfType | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previewUrl = book.driveFileId
    ? `https://drive.google.com/file/d/${book.driveFileId}/preview`
    : null;
  const openUrl = book.driveFileId
    ? `https://drive.google.com/file/d/${book.driveFileId}/view`
    : null;

  const addToShelf = async (type: ShelfType) => {
    setSaving(type);
    setMessage(null);
    try {
      await api.upsertShelf(book.id, type);
      setSavedType(type);
      setMessage('Đã lưu vào kệ sách của bạn.');
      onShelfChanged?.(book.id, type);
    } catch (err) {
      setMessage((err as Error).message || 'Không thể lưu vào kệ sách');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 100%)',
          height: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--ig-surface, #ffffff)',
          border: '1px solid var(--ig-border, #dddddd)',
          color: 'var(--ig-text, #111111)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid var(--ig-border, #dddddd)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{book.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{book.authors?.join(', ')}</div>
          </div>

          {shelfButtons.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              disabled={saving !== null}
              onClick={() => void addToShelf(type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                border: '1px solid var(--ig-border, #dddddd)',
                background: savedType === type ? 'rgba(22, 128, 61, 0.15)' : 'var(--ig-elevated, #f4f4f4)',
                color: 'var(--ig-text, #111111)',
              }}
            >
              <Icon size={14} />
              {saving === type ? 'Đang lưu...' : label}
            </button>
          ))}

          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--ig-text-secondary, #555555)',
              }}
            >
              <ExternalLink size={14} /> Mở tab mới
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ig-text, #111111)',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {message && (
          <div style={{ padding: '6px 14px', fontSize: 13, background: 'var(--ig-elevated, #f4f4f4)' }}>
            {message}
          </div>
        )}

        {previewUrl ? (
          <iframe
            title={book.title}
            src={previewUrl}
            allow="fullscreen"
            style={{ flex: 1, width: '100%', border: 0 }}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>Sách này chưa có file để đọc.</div>
        )}
      </div>
    </div>
  );
};
