import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Minus, Plus, X } from 'lucide-react';
import { Book, ShelfType } from '../types';
import { api } from '../services/api';

// ── Tải thư viện PDF.js từ CDN (không cần cài thêm gói) ──────────────────────
const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
const HEARTBEAT_MS = 10000;

interface PdfViewport {
  width: number;
  height: number;
}
interface PdfRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}
interface PdfPage {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    transform?: number[];
  }) => PdfRenderTask;
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
}
interface PdfJsLib {
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> };
  GlobalWorkerOptions: { workerSrc: string };
}

let pdfJsLoader: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  const existing = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
  if (existing) {
    existing.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return Promise.resolve(existing);
  }
  if (!pdfJsLoader) {
    pdfJsLoader = new Promise<PdfJsLib>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_URL;
      script.onload = () => {
        const lib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
        if (!lib) {
          reject(new Error('Không khởi tạo được trình đọc PDF'));
          return;
        }
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(lib);
      };
      script.onerror = () => {
        pdfJsLoader = null;
        reject(new Error('Không tải được trình đọc PDF. Hãy kiểm tra kết nối mạng.'));
      };
      document.head.appendChild(script);
    });
  }
  return pdfJsLoader;
}

interface ReadingStatus {
  creditedCount: number;
  totalPages: number | null;
  shelfType: ShelfType | null;
  pageCredited: boolean;
  activeSeconds: number;
  minSeconds: number;
  dailyCredits: number;
  dailyLimit: number;
}

interface BookReaderModalProps {
  book: Book;
  onClose: () => void;
  onShelfChanged?: (bookId: string, type: ShelfType) => void;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({ book, onClose, onShelfChanged }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(1);
  const [resizeTick, setResizeTick] = useState(0);
  const [status, setStatus] = useState<ReadingStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pdfRef = useRef<PdfDoc | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const changedRef = useRef(false);
  const shelfTypeRef = useRef<ShelfType | null>(null);

  const handleClose = useCallback(() => {
    if (changedRef.current && onShelfChanged) {
      onShelfChanged(book.id, shelfTypeRef.current ?? 'CURRENTLY_READING');
    }
    onClose();
  }, [book.id, onClose, onShelfChanged]);

  // Tải file sách + vị trí đọc dở
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!book.driveFileId) {
          throw new Error('Sách này chưa có file để đọc.');
        }
        const [state, buffer, lib] = await Promise.all([
          api.readerState(book.id).catch(() => null),
          api.fetchBookPdf(book.id),
          loadPdfJs(),
        ]);
        const doc = await lib.getDocument({ data: buffer }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        pdfRef.current = doc;
        setNumPages(doc.numPages);
        const start = Math.min(Math.max(state?.currentPage ?? 1, 1), doc.numPages);
        setPage(start);
        setPageInput(String(start));
        if (state) {
          shelfTypeRef.current = state.shelfType;
          setStatus({
            creditedCount: state.creditedCount,
            totalPages: state.totalPages,
            shelfType: state.shelfType,
            pageCredited: false,
            activeSeconds: 0,
            minSeconds: 15,
            dailyCredits: state.dailyCredits,
            dailyLimit: state.dailyLimit,
          });
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Không mở được sách');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (pdfRef.current) {
        void pdfRef.current.destroy();
        pdfRef.current = null;
      }
    };
  }, [book.id, book.driveFileId]);

  // Vẽ trang hiện tại
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (loading || error || !pdf || !canvas || !container) return;

    let cancelled = false;
    const taskRef: { current: PdfRenderTask | null } = { current: null };

    pdf
      .getPage(page)
      .then((p) => {
        if (cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const fit = Math.max(200, container.clientWidth - 16) / base.width;
        const viewport = p.getViewport({ scale: fit * zoom });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const task = p.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        taskRef.current = task;
        task.promise.catch(() => undefined); // bị hủy khi lật trang nhanh
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (taskRef.current) taskRef.current.cancel();
    };
  }, [page, zoom, loading, error, resizeTick]);

  // Vẽ lại khi đổi kích thước cửa sổ
  useEffect(() => {
    const onResize = () => setResizeTick((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Báo trang đang đọc lên máy chủ: ngay khi lật trang và mỗi 10 giây khi tab đang hiện
  useEffect(() => {
    if (loading || error || numPages === 0) return;
    let stopped = false;

    const send = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api.readerProgress({ bookId: book.id, page, totalPages: numPages });
        if (stopped || res.ignored) return;
        shelfTypeRef.current = res.shelfType;
        if (res.credited || res.completed) changedRef.current = true;
        setStatus({
          creditedCount: res.creditedCount,
          totalPages: res.totalPages,
          shelfType: res.shelfType,
          pageCredited: res.pageCredited,
          activeSeconds: res.activeSeconds,
          minSeconds: res.minSeconds,
          dailyCredits: res.dailyCredits,
          dailyLimit: res.dailyLimit,
        });
        if (res.completed && res.credited) {
          setNotice('Chúc mừng! Bạn đã đọc hết cuốn sách này và nó được chuyển sang Đã hoàn thành.');
        }
      } catch {
        // lỗi mạng tạm thời: bỏ qua, lần báo sau sẽ thử lại
      }
    };

    void send();
    const timer = setInterval(() => void send(), HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [page, numPages, loading, error, book.id]);

  const goTo = useCallback(
    (next: number) => {
      if (numPages === 0) return;
      const clamped = Math.min(Math.max(next, 1), numPages);
      setPage(clamped);
      setPageInput(String(clamped));
    },
    [numPages],
  );

  // Phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowRight') goTo(page + 1);
      else if (e.key === 'ArrowLeft') goTo(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, goTo, page]);

  const markWantToRead = async () => {
    try {
      await api.upsertShelf(book.id, 'WANT_TO_READ');
      shelfTypeRef.current = 'WANT_TO_READ';
      changedRef.current = true;
      setStatus((prev) => (prev ? { ...prev, shelfType: 'WANT_TO_READ' } : prev));
      setNotice('Đã lưu vào mục Muốn đọc.');
    } catch (err) {
      setNotice((err as Error).message || 'Không thể lưu vào kệ sách');
    }
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '7px 11px',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--ig-border, #dddddd)',
    background: 'var(--ig-elevated, #f4f4f4)',
    color: 'var(--ig-text, #111111)',
  };

  const canWantToRead = !status || status.shelfType === null;

  let statusText = '';
  if (status) {
    if (status.dailyCredits >= status.dailyLimit) {
      statusText = 'Bạn đã đạt giới hạn số trang được tính trong hôm nay.';
    } else if (status.pageCredited) {
      statusText = '✓ Trang này đã được tính.';
    } else {
      const remain = Math.max(0, status.minSeconds - status.activeSeconds);
      statusText = `Ở lại trang này thêm khoảng ${remain} giây để được tính.`;
    }
  }

  return (
    <div
      onClick={handleClose}
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
          width: 'min(1000px, 100%)',
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
        {/* Header */}
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
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{book.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{book.authors?.join(', ')}</div>
          </div>

          {canWantToRead && (
            <button type="button" onClick={() => void markWantToRead()} style={buttonStyle}>
              <Clock size={14} /> Muốn đọc
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ig-text, #111111)' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Thanh trạng thái */}
        {(status || notice) && (
          <div
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: 'var(--ig-elevated, #f4f4f4)',
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            {status && (
              <span>
                Đã tính {status.creditedCount}
                {status.totalPages ? ` / ${status.totalPages}` : ''} trang
              </span>
            )}
            {statusText && <span>{statusText}</span>}
            {notice && <span style={{ fontWeight: 700 }}>{notice}</span>}
          </div>
        )}

        {/* Vùng hiển thị trang */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#2b2b2b',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: 8,
            position: 'relative',
          }}
        >
          <canvas ref={canvasRef} style={{ background: '#ffffff', display: loading || error ? 'none' : 'block' }} />
          {loading && (
            <div style={{ color: '#ffffff', padding: 40 }}>Đang tải sách... (lần đầu có thể mất vài chục giây)</div>
          )}
          {error && <div style={{ color: '#fecaca', padding: 40, textAlign: 'center' }}>{error}</div>}
        </div>

        {/* Điều khiển */}
        {!loading && !error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '8px 14px',
              borderTop: '1px solid var(--ig-border, #dddddd)',
              flexWrap: 'wrap',
            }}
          >
            <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} style={buttonStyle} aria-label="Trang trước">
              <ChevronLeft size={16} />
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(pageInput, 10);
                if (!Number.isNaN(n)) goTo(n);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <span>Trang</span>
              <input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                inputMode="numeric"
                style={{
                  width: 56,
                  textAlign: 'center',
                  padding: '6px 4px',
                  borderRadius: 8,
                  border: '1px solid var(--ig-border, #dddddd)',
                  background: 'var(--ig-elevated, #f4f4f4)',
                  color: 'var(--ig-text, #111111)',
                }}
              />
              <span>/ {numPages}</span>
            </form>

            <button type="button" onClick={() => goTo(page + 1)} disabled={page >= numPages} style={buttonStyle} aria-label="Trang sau">
              <ChevronRight size={16} />
            </button>

            <span style={{ width: 16 }} />

            <button type="button" onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))} style={buttonStyle} aria-label="Thu nhỏ">
              <Minus size={14} />
            </button>
            <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(2.4, Math.round((z + 0.2) * 10) / 10))} style={buttonStyle} aria-label="Phóng to">
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
