import React, { useState, useEffect } from 'react';
import { Story } from '../types';
import { X, Heart, Send, BookOpen, Sparkles } from 'lucide-react';

interface StoryViewerModalProps {
  story: Story;
  onClose: () => void;
  onNext?: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onNext,
}) => {
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');

  // 5-second story auto-advance timer
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onNext) onNext();
          else onClose();
          return 100;
        }
        return prev + 2; // ~50 ticks of 100ms = 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story.id]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Story Container (Phone Aspect Ratio) */}
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: 420,
          height: '85vh',
          maxHeight: 740,
          backgroundColor: '#1a1a1a',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            height: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#ffffff',
              borderRadius: 2,
              transition: 'width 100ms linear',
            }}
          />
        </div>

        {/* Story Header */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 14,
            right: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--ig-story-gradient)',
                padding: 1.5,
              }}
            >
              <img
                src={story.image}
                alt={story.user.biDanh}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {story.user.biDanh}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {story.createdAt}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              color: '#ffffff',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '50%',
              padding: 6,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Story Background Image */}
        <img
          src={story.image}
          alt="Story background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.75)',
          }}
        />

        {/* Story Overlay Content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 30,
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          {story.bookTitle && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 9999,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(10px)',
                color: 'var(--amber-400)',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              <BookOpen size={14} />
              {story.bookTitle}
            </div>
          )}

          {story.quote && (
            <blockquote
              style={{
                fontFamily: 'serif',
                fontSize: 20,
                fontStyle: 'italic',
                lineHeight: 1.5,
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                marginBottom: 16,
              }}
            >
              "{story.quote}"
            </blockquote>
          )}

          {story.currentPage && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.9)',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '4px 12px',
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              📖 Đang ở trang {story.currentPage} / {story.pageCount || 300}
            </div>
          )}
        </div>

        {/* Bottom Reaction & Reply Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 20,
          }}
        >
          <input
            type="text"
            placeholder="Gửi tin nhắn phản hồi..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: 13,
            }}
          />
          <button
            onClick={() => setLiked(!liked)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: liked ? 'var(--ig-heart-red)' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Heart size={20} fill={liked ? 'var(--ig-heart-red)' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
};
