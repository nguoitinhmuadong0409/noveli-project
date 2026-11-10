import {
  User,
  Book,
  ShelfItem,
  ShelfType,
  Review,
  Thread,
  Post,
  DashboardStats,
  ReadingChartPoint,
  LeaderboardEntry,
  AIRecommendationResponse,
  ChatConversation,
  ChatMessage,
  FeedPost,
  FeedComment,
} from '../types';

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
const BASE_URL = `${API_ORIGIN}/api/v1`;

function timeAgo(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(time).toLocaleDateString('vi-VN');
}

function formatFeedPost(post: FeedPost): FeedPost {
  return {
    ...post,
    createdAt: timeAgo(post.createdAt),
    comments: (post.comments || []).map((c) => ({ ...c, createdAt: timeAgo(c.createdAt) })),
  };
}

export function getToken(): string | null {
  return localStorage.getItem('novoli_token');
}

export function setToken(token: string): void {
  localStorage.setItem('novoli_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('novoli_token');
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      clearToken();
      return null;
    }

    const data = await res.json();
    if (data.accessToken) {
      setToken(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    clearToken();
    return null;
  }
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401 && retry && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh') && !endpoint.startsWith('/auth/register')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      onTokenRefreshed(newToken);

      if (newToken) {
        return fetchWithAuth<T>(endpoint, options, false);
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (newToken) {
            resolve(fetchWithAuth<T>(endpoint, options, false));
          } else {
            reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
          }
        });
      });
    }
  }

  if (!res.ok) {
    let errorMsg = 'Đã có lỗi xảy ra';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ─────────────────────────────────────────────
  login: async (biDanh: string, password: string): Promise<{ user: User; accessToken: string }> => {
    const res = await fetchWithAuth<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ biDanh, password }),
    });
    setToken(res.accessToken);
    return res;
  },

  register: async (biDanh: string, password: string, ownerSetupKey?: string): Promise<{ user: User; accessToken: string; recoveryKey: string }> => {
    const res = await fetchWithAuth<{ user: User; accessToken: string; recoveryKey: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ biDanh, password, ...(ownerSetupKey ? { ownerSetupKey } : {}) }),
    });
    setToken(res.accessToken);
    return res;
  },

  getMe: async (): Promise<{ user: User }> => {
    return fetchWithAuth<{ user: User }>('/auth/me');
  },

  getAdminDashboard: async (): Promise<{
    isOwner: boolean;
    stats: {
      totalUsers: number;
      totalAdmins: number;
      totalBooks: number;
      totalReviews: number;
      totalThreads: number;
      totalPosts: number;
    };
    users: Pick<User, 'id' | 'biDanh' | 'role' | 'currentStreak' | 'createdAt'>[];
  }> => fetchWithAuth('/admin/dashboard'),

  updateUserRole: async (userId: string, role: 'user' | 'admin'): Promise<void> => {
    await fetchWithAuth(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  updateMe: async (data: { avatarSeed?: string; preferences?: Record<string, unknown> }): Promise<{ user: User }> => {
    return fetchWithAuth<{ user: User }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return fetchWithAuth<{ message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  rotateRecoveryKey: async (currentPassword: string): Promise<{ message: string; recoveryKey: string }> => {
    return fetchWithAuth('/auth/recovery-key/rotate', {
      method: 'POST',
      body: JSON.stringify({ currentPassword }),
    });
  },

  recoverPassword: async (biDanh: string, recoveryKey: string, newPassword: string): Promise<{ message: string }> => {
    return fetchWithAuth<{ message: string }>('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ biDanh, recoveryKey, newPassword }),
    });
  },

  refreshToken: async (): Promise<string | null> => {
    return refreshAccessToken();
  },

  logout: async (): Promise<void> => {
    try {
      await fetchWithAuth('/auth/logout', { method: 'POST' }, false);
    } catch {
      // ignore network errors on logout
    } finally {
      clearToken();
    }
  },

  logoutAll: async (): Promise<void> => {
    try {
      await fetchWithAuth('/auth/logout-all', { method: 'POST' }, false);
    } catch {
      // ignore network errors
    } finally {
      clearToken();
    }
  },

  // ── Books ────────────────────────────────────────────
  getBooks: async (params?: { category?: string; search?: string; page?: number; limit?: number }): Promise<{ books: Book[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return fetchWithAuth(`/books${qs ? `?${qs}` : ''}`);
  },

  createBook: async (data: {
    title: string;
    authors: string[];
    description?: string | null;
    coverUrl?: string | null;
    pageCount?: number | null;
    categories: string[];
    driveLink: string;
  }): Promise<{ book: Book }> => {
    return fetchWithAuth('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteBook: async (id: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getBookDetail: async (id: string): Promise<{ book: Book }> => {
    return fetchWithAuth(`/books/${id}`);
  },

  getBookReviews: async (bookId: string): Promise<{ reviews: Review[]; pagination: unknown }> => {
    return fetchWithAuth(`/books/${bookId}/reviews`);
  },

  addReview: async (bookId: string, review: { rating: number; content: string; hasSpoilers: boolean; isAnonymous: boolean; anonymousAlias?: string }): Promise<{ review: Review }> => {
    return fetchWithAuth(`/books/${bookId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  },

  // ── Shelves ──────────────────────────────────────────
  getUserShelves: async (type?: ShelfType): Promise<{ shelves: ShelfItem[] }> => {
    const qs = type ? `?type=${type}` : '';
    return fetchWithAuth(`/shelves${qs}`);
  },

  upsertShelf: async (bookId: string, type: ShelfType): Promise<{ shelf: ShelfItem }> => {
    return fetchWithAuth('/shelves', {
      method: 'PUT',
      body: JSON.stringify({ bookId, type }),
    });
  },

  updateProgress: async (bookId: string, currentPage: number): Promise<{ shelf: ShelfItem; isFinished: boolean }> => {
    return fetchWithAuth(`/shelves/${bookId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPage }),
    });
  },

  removeFromShelf: async (bookId: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`/shelves/${bookId}`, {
      method: 'DELETE',
    });
  },

  // ── Analytics & Stats ────────────────────────────────
  getDashboard: async (): Promise<DashboardStats> => {
    return fetchWithAuth('/analytics/dashboard');
  },

  getReadingChart: async (days = 7): Promise<{ chartData: ReadingChartPoint[] }> => {
    return fetchWithAuth(`/analytics/reading-chart?days=${days}`);
  },

  getLeaderboard: async (month: number, year: number): Promise<{ month: number; year: number; leaderboard: LeaderboardEntry[] }> => {
    const searchParams = new URLSearchParams({ month: String(month), year: String(year) });
    return fetchWithAuth(`/leaderboard?${searchParams.toString()}`);
  },

  getChatConversations: async (): Promise<{ conversations: ChatConversation[] }> => {
    return fetchWithAuth('/chat/conversations');
  },

  createDirectConversation: async (biDanh: string): Promise<{ conversationId: string }> => {
    return fetchWithAuth('/chat/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ biDanh }),
    });
  },

  createGroupConversation: async (name: string, members: string[]): Promise<{ conversationId: string }> => {
    return fetchWithAuth('/chat/conversations/groups', {
      method: 'POST',
      body: JSON.stringify({ name, members }),
    });
  },

  addChatGroupMembers: async (conversationId: string, members: string[]): Promise<{ added: number }> => {
    return fetchWithAuth(`/chat/conversations/${encodeURIComponent(conversationId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
  },

  getChatMessages: async (conversationId: string): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
    return fetchWithAuth(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
  },

  sendChatMessage: async (conversationId: string, content: string): Promise<{ message: ChatMessage }> => {
    return fetchWithAuth(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // ── Reading Logs ─────────────────────────────────────
  logReadingSession: async (log: { bookId: string; startPage: number; endPage: number; durationMinutes: number; note?: string }): Promise<unknown> => {
    const pagesRead = Math.max(0, log.endPage - log.startPage);
    return fetchWithAuth('/reading-logs/sync', {
      method: 'POST',
      body: JSON.stringify({
        logs: [
          {
  clientLogId: crypto.randomUUID(),
  bookId: log.bookId,
  startPage: log.startPage,
  currentPage: log.endPage,
  durationMinutes: log.durationMinutes,
  note: log.note,
  loggedAt: new Date().toISOString(),
},
        ],
      }),
    });
  },

  // ── Anonymous Forum ──────────────────────────────────
  getThreads: async (params?: { bookId?: string; page?: number; limit?: number }): Promise<{ threads: Thread[]; pagination: unknown }> => {
    const searchParams = new URLSearchParams();
    if (params?.bookId) searchParams.set('bookId', params.bookId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return fetchWithAuth(`/forum/threads${qs ? `?${qs}` : ''}`);
  },

  getThread: async (threadId: string): Promise<{ thread: Thread }> => {
    return fetchWithAuth(`/forum/threads/${threadId}`);
  },

  getThreadPosts: async (threadId: string): Promise<{ posts: Post[]; nextCursor: string | null; hasMore: boolean }> => {
    return fetchWithAuth(`/forum/threads/${threadId}/posts`);
  },

  createThread: async (data: { title: string; content: string; tags: string[]; hasSpoilers: boolean; bookId?: string }): Promise<{ thread: Thread }> => {
    return fetchWithAuth('/forum/threads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createPost: async (data: { threadId: string; content: string; hasSpoilers: boolean; parentPostId?: string }): Promise<{ post: Post }> => {
    return fetchWithAuth('/forum/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Thích / bỏ thích một bình luận (toggle). Trả về số upvotes mới và trạng thái đã thích.
  upvotePost: async (postId: string): Promise<{ upvotes: number; upvoted: boolean }> => {
    return fetchWithAuth(`/forum/posts/${encodeURIComponent(postId)}/upvote`, {
      method: 'POST',
    });
  },

  // Danh sách id bình luận trong thread mà người dùng hiện tại đã thích.
  getMyUpvotes: async (threadId: string): Promise<{ postIds: string[] }> => {
    return fetchWithAuth(`/forum/threads/${encodeURIComponent(threadId)}/my-upvotes`);
  },

  // ── Feed (bài đăng trang chủ) ────────────────────────
  getFeedPosts: async (): Promise<{ posts: FeedPost[] }> => {
    const res = await fetchWithAuth<{ posts: FeedPost[] }>('/feed/posts');
    return { posts: (res.posts || []).map(formatFeedPost) };
  },

  createFeedPost: async (data: {
    bookId: string;
    caption: string;
    image: string;
    currentPage?: number | null;
  }): Promise<{ post: FeedPost }> => {
    const res = await fetchWithAuth<{ post: FeedPost }>('/feed/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { post: formatFeedPost(res.post) };
  },

  deleteFeedPost: async (postId: string): Promise<{ success: boolean }> => {
    return fetchWithAuth(`/feed/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  },

  toggleFeedLike: async (postId: string): Promise<{ liked: boolean; likesCount: number }> => {
    return fetchWithAuth(`/feed/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
  },

  addFeedComment: async (postId: string, content: string): Promise<{ comment: FeedComment }> => {
    const res = await fetchWithAuth<{ comment: FeedComment }>(
      `/feed/posts/${encodeURIComponent(postId)}/comments`,
      { method: 'POST', body: JSON.stringify({ content }) },
    );
    return { comment: { ...res.comment, createdAt: timeAgo(res.comment.createdAt) } };
  },

  // ── AI Recommendations ───────────────────────────────
  getAIRecommendations: async (moodPrompt?: string): Promise<AIRecommendationResponse> => {
    return fetchWithAuth('/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ moodPrompt: moodPrompt || '' }),
    });
  },
};
