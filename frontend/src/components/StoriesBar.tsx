import React from 'react';
import { Story } from '../types';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StoriesBarProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onOpenCreateStory: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  onSelectStory,
  onOpenCreateStory,
}) => {
  const { user } = useAuth();

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: '16px 4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        borderBottom: '1px solid var(--ig-border-subtle)',
        marginBottom: 20,
      }}
    >
      {/* Current User: Add Story */}
      <div
        onClick={onOpenCreateStory}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--ig-elevated)',
              border: '2px solid var(--ig-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--ig-text)',
            }}
          >
            {user ? user.biDanh[0].toUpperCase() : 'U'}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: 'var(--ig-primary-blue)',
              border: '2px solid var(--ig-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Plus size={14} strokeWidth={3} />
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ig-text-secondary)',
            maxWidth: 72,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Tin của bạn
        </span>
      </div>

      {/* Community Stories */}
      {stories.map((story) => (
        <div
          key={story.id}
          onClick={() => onSelectStory(story)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <div className={story.seen ? 'story-ring-seen' : 'story-ring-active'}>
            <div className="story-avatar-inner" style={{ width: 60, height: 60 }}>
              <img
                src={story.image}
                alt={story.user.biDanh}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              color: story.seen ? 'var(--ig-text-muted)' : 'var(--ig-text)',
              maxWidth: 72,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {story.user.biDanh}
          </span>
        </div>
      ))}
    </div>
  );
};
