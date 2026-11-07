import React, { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Send, Music2, BookOpen, Volume2 } from 'lucide-react';
import { Book } from '../types';

interface ReelsQuotesViewProps {
  onSelectBook?: (book: Book) => void;
}

export const ReelsQuotesView: React.FC<ReelsQuotesViewProps> = () => {
  const [likes, setLikes] = useState<Record<string, { count: number; active: boolean }>>({
    'reel-1': { count: 320, active: false },
    'reel-2': { count: 540, active: false },
    'reel-3': { count: 890, active: false },
    'reel-4': { count: 410, active: false },
  });

  const quotes = [
    {
      id: 'reel-1',
      book: 'Rừng Na Uy',
      author: 'Haruki Murakami',
      quote: 'Cái chết không phải là đối nghịch của sự sống mà là một phần của nó. Bằng cách sống cuộc đời của mình, chúng ta đồng thời nuôi dưỡng cái chết.',
      sound: 'Lo-fi Rainy Night • Tokyo Coffee',
      bg: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
      user: 'sach_va_tra',
      page: 'Trang 210',
    },
    {
      id: 'reel-2',
      book: 'Nhà Giả Kim',
      author: 'Paulo Coelho',
      quote: 'Khi bạn khao khát một điều gì đó, cả vũ trụ sẽ hợp lực giúp bạn đạt được điều đó. Đừng bao giờ từ bỏ ước mơ của mình.',
      sound: 'Desert Wind Ambient • Santiago Journey',
      bg: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800',
      user: 'ke_ngao_du',
      page: 'Trang 182',
    },
    {
      id: 'reel-3',
      book: 'Cây Cam Ngọt Của Tôi',
      author: 'José Mauro de Vasconcelos',
      quote: 'Tại sao người ta lại phải nói cho một đứa trẻ biết những điều như thế? Trái tim của Zezé quá bé nhỏ trước nỗi đau của thế giới người lớn.',
      sound: 'Acoustic Piano • Sweet Orange Tree',
      bg: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
      user: 'dem_muon_doc_sach',
      page: 'Trang 244',
    },
    {
      id: 'reel-4',
      book: '1984',
      author: 'George Orwell',
      quote: 'Tự do là quyền được nói rằng hai cộng hai bằng bốn. Nếu điều đó được thừa nhận, mọi thứ khác sẽ tự khắc tuân theo.',
      sound: 'Dystopian Clock Ticking • Big Brother Watch',
      bg: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
      user: 'triet_hoc_dem',
      page: 'Trang 120',
    },
  ];

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const cur = prev[id] || { count: 100, active: false };
      return {
        ...prev,
        [id]: {
          count: cur.active ? cur.count - 1 : cur.count + 1,
          active: !cur.active,
        },
      };
    });
  };

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '16px 12px 80px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {quotes.map((q) => {
          const isLiked = likes[q.id]?.active;
          const likeCount = likes[q.id]?.count || 100;

          return (
            <div
              key={q.id}
              style={{
                position: 'relative',
                width: '100%',
                height: '75vh',
                maxHeight: 680,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: '#111',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              }}
            >
              {/* Background cover image */}
              <img
                src={q.bg}
                alt={q.book}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.65)',
                }}
              />

              {/* Gradient Scrim */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)',
                }}
              />

              {/* Top Tag */}
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--amber-400)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <BookOpen size={13} /> {q.book} • {q.page}
                </div>
              </div>

              {/* Center Quote Text */}
              <div
                style={{
                  position: 'absolute',
                  inset: '80px 60px 100px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <blockquote
                  style={{
                    fontFamily: 'serif',
                    fontSize: 21,
                    fontStyle: 'italic',
                    color: '#ffffff',
                    lineHeight: 1.6,
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    marginBottom: 16,
                  }}
                >
                  "{q.quote}"
                </blockquote>
                <div style={{ fontSize: 13, color: 'var(--amber-400)', fontWeight: 700 }}>
                  — {q.author}
                </div>
              </div>

              {/* Right Action Rail (Instagram Reels Style) */}
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  zIndex: 10,
                }}
              >
                {/* Like */}
                <button
                  onClick={() => toggleLike(q.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: isLiked ? 'var(--ig-heart-red)' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={28} fill={isLiked ? 'var(--ig-heart-red)' : 'none'} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{likeCount}</span>
                </button>

                {/* Comment */}
                <button
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <MessageCircle size={28} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>18</span>
                </button>

                {/* Bookmark */}
                <button style={{ color: '#ffffff', cursor: 'pointer' }}>
                  <Bookmark size={26} />
                </button>

                {/* Share */}
                <button style={{ color: '#ffffff', cursor: 'pointer' }}>
                  <Send size={24} />
                </button>
              </div>

              {/* Bottom Sound Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 20,
                  right: 70,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: 12,
                }}
              >
                <Music2 size={14} className="animate-streak-fire" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.sound}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
