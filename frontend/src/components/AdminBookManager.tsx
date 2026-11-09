import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Book } from '../types';
import { getBookCover } from '../utils/bookCover';

const emptyForm = {
  title: '',
  authors: '',
  coverUrl: '',
  pageCount: '',
  categories: '',
  description: '',
  driveLink: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 9,
  border: '1px solid var(--ig-border, #dddddd)',
  background: 'var(--ig-elevated, #f4f4f4)',
  color: 'var(--ig-text, #111111)',
  fontSize: 14,
};

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

interface AdminBookManagerProps {
  onChanged?: () => void;
}

export const AdminBookManager: React.FC<AdminBookManagerProps> = ({ onChanged }) => {
  const [form, setForm] = useState(emptyForm);
  const [books, setBooks] = useState<Book[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      const res = await api.getBooks({ limit: 50 });
      setBooks(res.books || []);
    } catch (err) {
      console.error('Không tải được danh sách sách:', err);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const setField = (key: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.driveLink.trim()) {
      setMessage({ ok: false, text: 'Cần nhập tên sách và link Google Drive.' });
      return;
    }
    const pages = parseInt(form.pageCount, 10);
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.createBook({
        title: form.title.trim(),
        authors: splitList(form.authors),
        coverUrl: form.coverUrl.trim() || null,
        pageCount: Number.isNaN(pages) ? null : pages,
        categories: splitList(form.categories),
        description: form.description.trim() || null,
        driveLink: form.driveLink.trim(),
      });
      setBooks((prev) => [res.book, ...prev]);
      setForm(emptyForm);
      setMessage({ ok: true, text: 'Đã thêm sách vào thư viện.' });
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message || 'Không thể thêm sách' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`Xóa "${book.title}" khỏi thư viện? Kệ sách và đánh giá của sách này cũng sẽ mất.`)) return;
    try {
      await api.deleteBook(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      onChanged?.();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message || 'Không thể xóa sách' });
    }
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Thư viện sách</h2>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          border: '1px solid var(--ig-border, #dddddd)',
          background: 'var(--ig-surface, #ffffff)',
        }}
      >
        <input
          style={inputStyle}
          placeholder="Tên sách *"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Tác giả (cách nhau bằng dấu phẩy)"
          value={form.authors}
          onChange={(e) => setField('authors', e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Link file PDF trên Google Drive *"
          value={form.driveLink}
          onChange={(e) => setField('driveLink', e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Link ảnh bìa (bỏ trống thì lấy trang đầu của PDF)"
          value={form.coverUrl}
          onChange={(e) => setField('coverUrl', e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Số trang"
          inputMode="numeric"
          value={form.pageCount}
          onChange={(e) => setField('pageCount', e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Thể loại (ví dụ: Tiểu thuyết, Kinh điển)"
          value={form.categories}
          onChange={(e) => setField('categories', e.target.value)}
        />
        <textarea
          style={{ ...inputStyle, gridColumn: '1 / -1', minHeight: 70, resize: 'vertical' }}
          placeholder="Mô tả ngắn"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
        />
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 9,
              border: 'none',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              background: '#15803d',
              color: '#ffffff',
            }}
          >
            <Plus size={16} /> {saving ? 'Đang thêm...' : 'Thêm sách'}
          </button>
          {message && (
            <span style={{ fontSize: 13, color: message.ok ? '#15803d' : '#b91c1c' }}>{message.text}</span>
          )}
        </div>
      </form>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {books.length === 0 ? (
          <p style={{ color: 'var(--ig-text-secondary, #555555)' }}>Thư viện chưa có sách nào.</p>
        ) : (
          books.map((book) => (
            <div
              key={book.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: 10,
                border: '1px solid var(--ig-border, #dddddd)',
                background: 'var(--ig-surface, #ffffff)',
              }}
            >
              <img
                src={getBookCover(book)}
                alt={book.title}
                style={{ width: 40, height: 58, objectFit: 'cover', borderRadius: 6 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{book.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{book.authors?.join(', ')}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(book)}
                aria-label="Xóa sách"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#b91c1c' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
