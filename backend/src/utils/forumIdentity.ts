import crypto from 'crypto';
import { ENV } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
//  FORUM IDENTITY ENGINE — Unlinkable Per-Thread Anonymity
// ─────────────────────────────────────────────────────────────────────────────
//
//  Security guarantee:
//    authorHash = HMAC_SHA256(userId + ":" + threadId, FORUM_ANONYMOUS_SECRET)
//
//  Properties:
//    1. CONSISTENCY: Same user in same thread → same authorHash → same alias.
//    2. ISOLATION: Same user in different threads → different authorHash → different alias.
//    3. NON-REVERSIBILITY: DB compromise cannot map authorHash back to userId
//       without knowing FORUM_ANONYMOUS_SECRET.
//    4. OP DETECTION: If poster's authorHash === thread.authorHash → isOp = true.
// ─────────────────────────────────────────────────────────────────────────────

// Vietnamese adjectives for alias generation
const ADJECTIVES = [
  'Bí Ẩn', 'Lặng Thầm', 'Mơ Màng', 'Trầm Tĩnh', 'Hoang Dại',
  'Ngây Thơ', 'Thông Thái', 'Cô Đơn', 'Phiêu Lãng', 'Huyền Bí',
  'Tự Do', 'Chân Thật', 'Nhiệt Huyết', 'Sâu Sắc', 'Tinh Tế',
  'Kỳ Lạ', 'Dịu Dàng', 'Mạnh Mẽ', 'Ẩn Mình', 'Lang Thang',
];

// Vietnamese nouns (animals / nature entities) for alias generation
const NOUNS = [
  'Cú Đêm', 'Hồ Ly', 'Sói Trắng', 'Mèo Rừng', 'Đại Bàng',
  'Rồng Biển', 'Hươu Sao', 'Thiên Nga', 'Cáo Bạc', 'Bướm Đêm',
  'Ngựa Hoang', 'Voi Già', 'Nai Vàng', 'Hổ Xám', 'Chim Hạc',
  'Bạch Tuộc', 'Sư Tử', 'Thỏ Đen', 'Cá Hổ', 'Diều Hâu',
];

// Season modifier for extra variety
const SEASONS = ['Mùa Xuân', 'Mùa Hạ', 'Mùa Thu', 'Mùa Đông'];

export interface ForumIdentity {
  authorHash: string;
  displayAlias: string;
  isOp: boolean;
}

/**
 * Generates a deterministic, privacy-preserving forum identity.
 *
 * @param userId          - The authenticated user's UUID
 * @param threadId        - The target thread's UUID
 * @param threadAuthorHash - The stored authorHash of the thread's original poster (null if this IS the new thread)
 */
export function generateForumIdentity(
  userId: string,
  threadId: string,
  threadAuthorHash: string | null = null,
): ForumIdentity {
  // Step 1: Derive HMAC-SHA256 hash
  const authorHash = crypto
    .createHmac('sha256', ENV.FORUM_ANONYMOUS_SECRET)
    .update(`${userId}:${threadId}`)
    .digest('hex');

  // Step 2: Use hash bytes as deterministic indices into word arrays
  // Byte 0 → noun index, Byte 1 → adjective index, Byte 2 → season index
  const byte0 = parseInt(authorHash.slice(0, 2), 16);
  const byte1 = parseInt(authorHash.slice(2, 4), 16);
  const byte2 = parseInt(authorHash.slice(4, 6), 16);

  const noun = NOUNS[byte0 % NOUNS.length];
  const adjective = ADJECTIVES[byte1 % ADJECTIVES.length];
  const season = SEASONS[byte2 % SEASONS.length];

  // Hex suffix uses chars 6-9 of the hash for visual distinctiveness
  const hexSuffix = authorHash.slice(6, 10).toUpperCase();

  // Final alias format: "Cú Đêm Mùa Thu #4F2A"
  const displayAlias = `${noun} ${season} ${adjective} #${hexSuffix}`;

  // Step 3: Determine OP status
  const isOp = threadAuthorHash !== null && authorHash === threadAuthorHash;

  return { authorHash, displayAlias, isOp };
}
