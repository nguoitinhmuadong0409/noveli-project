import React, { useState } from 'react';
import { BookRecommendation, AIRecommendationResponse, Book } from '../types';
import { api } from '../services/api';
import { Sparkles, Compass, Clock, CheckCircle2, Award, Zap } from 'lucide-react';

interface AIAdvisorViewProps {
  onSearchBook: (query: string) => void;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ onSearchBook }) => {
  const [moodPrompt, setMoodPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);

  const moodPresets = [
    'Cần động lực và cảm hứng vượt qua bế tắc',
    'Muốn cuốn sách chữa lành, bình yên cho tâm hồn',
    'Thích tiểu thuyết bí ẩn, giật gân và hack não',
    'Muốn thấu hiểu tâm lý con người và tư duy tài chính',
    'Khám phá văn học kinh điển phản địa đàng sâu sắc',
  ];

  const handleGenerate = async (promptToUse?: string) => {
    const finalPrompt = promptToUse ?? moodPrompt;
    setLoading(true);
    try {
      const data = await api.getAIRecommendations(finalPrompt);
      setResult(data);
    } catch (err) {
      alert((err as Error).message || 'Không thể tạo gợi ý AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '30px 28px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(245, 158, 11, 0.12) 60%, var(--bg-surface) 90%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: 30,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--indigo-400)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          <Sparkles size={14} /> novoli LITERARY AI ADVISOR
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Cố Vấn Đọc Sách Thông Minh
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Phân tích hồ sơ độc giả, tốc độ đọc trang/ngày và tâm trạng hiện tại để đề xuất 5 cuốn sách lý tưởng nhất dành riêng cho bạn.
        </p>

        {/* Mood Chips */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Chọn nhanh tâm trạng & nhu cầu đọc:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {moodPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setMoodPrompt(preset);
                  handleGenerate(preset);
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: 12,
                  background: moodPrompt === preset ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface-elevated)',
                  borderColor: moodPrompt === preset ? 'var(--indigo-400)' : 'var(--border-subtle)',
                  color: moodPrompt === preset ? 'var(--indigo-400)' : 'var(--text-secondary)',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Textarea & Button */}
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Hoặc tự mô tả cảm xúc: 'Tôi muốn tìm sách nhẹ nhàng sau một ngày dài làm việc căng thẳng...'"
            className="input-field"
            value={moodPrompt}
            onChange={(e) => setMoodPrompt(e.target.value)}
            style={{ flex: 1, minWidth: 260 }}
          />
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="btn btn-primary"
            style={{ height: 46 }}
          >
            <Zap size={16} />
            {loading ? 'AI đang đọc gu của bạn...' : 'Phân tích & Đề xuất'}
          </button>
        </div>
      </div>

      {/* AI Recommendation Results */}
      {result && (
        <div className="animate-fade-in">
          {/* Reader Persona Summary */}
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hover)',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber-400)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              <Award size={18} /> PHÂN TÍCH CHÂN DUNG ĐỘC GIẢ (READER PERSONA)
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{result.readerPersonaSummary}"
            </p>
          </div>

          {/* 5 Recommended Books */}
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
            Top 5 Cuốn Sách Dành Riêng Cho Bạn
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result.recommendations.map((rec, index) => (
              <div
                key={index}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: 20,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> {rec.matchScore}% Phù hợp
                    </span>
                    <span className="badge badge-indigo">
                      {rec.category}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> Ước tính {rec.estimatedReadingDays} ngày đọc
                    </span>
                  </div>

                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {rec.title}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--amber-400)', fontWeight: 600, marginBottom: 8 }}>
                    Tác giả: {rec.author}
                  </p>

                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>Vì sao cuốn sách này dành cho bạn:</strong> {rec.whyItMatches}
                  </p>
                </div>

                <button
                  onClick={() => onSearchBook(rec.title)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, marginTop: 4 }}
                >
                  <Compass size={14} /> Khám phá sách
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
