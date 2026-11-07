import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './config/prisma';
import { ShelfType, GoalStatus } from '@prisma/client';

async function main() {
  console.log('🌱 Starting database seeding for novoli...');

  // Clean existing data in reverse order of foreign keys
  await prisma.post.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.readingLog.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.review.deleteMany();
  await prisma.shelf.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // ─── 1. Books Seed ────────────────────────────────────────────────────────
  const sampleBooks = [
    {
      isbn13: '9786045864111',
      title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu?',
      authors: ['Rosie Nguyễn'],
      description: 'Cuốn sách của một người đã đi qua thời tuổi trẻ bộc bạch những chiêm nghiệm sâu sắc về việc học, làm và đi.',
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
      pageCount: 292,
      categories: ['Kỹ năng sống', 'Self-help', 'Phát triển bản thân'],
      publishedDate: '2016',
      avgRating: 4.65,
      ratingsCount: 1420,
    },
    {
      isbn13: '9786042188448',
      title: 'Dế Mèn Phiêu Lưu Ký',
      authors: ['Tô Hoài'],
      description: 'Tác phẩm văn học thiếu nhi kinh điển của Việt Nam kể về hành trình phiêu lưu và bài học trưởng thành của chú Dế Mèn.',
      coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
      pageCount: 196,
      categories: ['Văn học thiếu nhi', 'Văn học Việt Nam', 'Kinh điển'],
      publishedDate: '1941',
      avgRating: 4.80,
      ratingsCount: 3120,
    },
    {
      isbn13: '9786045624111',
      title: 'Rừng Na Uy (Norwegian Wood)',
      authors: ['Haruki Murakami'],
      description: 'Câu chuyện tình yêu, sự cô đơn và nỗi mất mát của tuổi trẻ Tokyo những năm 1960 qua góc nhìn của Toru Watanabe.',
      coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80',
      pageCount: 540,
      categories: ['Tiểu thuyết', 'Văn học Nhật Bản', 'Tâm lý'],
      publishedDate: '1987',
      avgRating: 4.45,
      ratingsCount: 2890,
    },
    {
      isbn13: '9780451524935',
      title: '1984',
      authors: ['George Orwell'],
      description: 'Kiệt tác văn học phản địa đàng kinh điển về một thế giới toàn trị bị kiểm soát bởi Big Brother và Thought Police.',
      coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
      pageCount: 328,
      categories: ['Dystopia', 'Triết học', 'Kinh điển thế giới'],
      publishedDate: '1949',
      avgRating: 4.75,
      ratingsCount: 4500,
    },
    {
      isbn13: '9786045882191',
      title: 'Nhà Giả Kim (The Alchemist)',
      authors: ['Paulo Coelho'],
      description: 'Hành trình đi tìm kho báu của chàng chăn cừu Santiago qua sa mạc Ai Cập và bài học lắng nghe tiếng nói của trái tim.',
      coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80',
      pageCount: 228,
      categories: ['Tiểu thuyết', 'Triết lý sống', 'Cảm hứng'],
      publishedDate: '1988',
      avgRating: 4.70,
      ratingsCount: 5600,
    },
    {
      isbn13: '9786049871120',
      title: 'Sapiens: Lược Sử Loài Người',
      authors: ['Yuval Noah Harari'],
      description: 'Khám phá chặng đường tiến hóa ngoạn mục của loài người từ vượn cổ đến khi thống trị hành tinh xanh.',
      coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=600&auto=format&fit=crop&q=80',
      pageCount: 560,
      categories: ['Lịch sử', 'Khoa học xã hội', 'Nhân học'],
      publishedDate: '2014',
      avgRating: 4.85,
      ratingsCount: 3900,
    },
    {
      isbn13: '9786049988118',
      title: 'Tâm Lý Học Về Tiền',
      authors: ['Morgan Housel'],
      description: '19 câu chuyện ngắn khai mở cách con người suy nghĩ về tiền bạc, sự giàu có, cái tôi và sự tự do tài chính.',
      coverUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=80',
      pageCount: 384,
      categories: ['Tài chính cá nhân', 'Tâm lý học', 'Đầu tư'],
      publishedDate: '2020',
      avgRating: 4.72,
      ratingsCount: 2100,
    },
    {
      isbn13: '9786045681122',
      title: 'Cây Cam Ngọt Của Tôi',
      authors: ['José Mauro de Vasconcelos'],
      description: 'Câu chuyện đẫm nước mắt về cậu bé Zezé 5 tuổi nghèo khổ, đầy trí tưởng tượng và người bạn thân là cây cam ngọt.',
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      pageCount: 244,
      categories: ['Tiểu thuyết', 'Gia đình', 'Cảm động'],
      publishedDate: '1968',
      avgRating: 4.90,
      ratingsCount: 3800,
    },
  ];

  const createdBooks = [];
  for (const b of sampleBooks) {
    const book = await prisma.book.create({ data: b });
    createdBooks.push(book);
  }
  console.log(`📚 Created ${createdBooks.length} curated books.`);

  // ─── 2. Users Seed ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('novoli@2026!', 10);
  const recoveryHash = (key: string) => crypto.createHash('sha256').update(key).digest('hex');

  const user1 = await prisma.user.create({
    data: {
      biDanh: 'sach_va_tra',
      passwordHash,
      recoveryKeyHash: recoveryHash('recovery-code-user-1'),
      avatarSeed: 'tea_lover_99',
      preferences: { theme: 'dark', notificationsEnabled: true, dailyReadingTargetMinutes: 30 },
      currentStreak: 7,
      longestStreak: 21,
      lastReadDate: new Date(),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      biDanh: 'ke_ngao_du',
      passwordHash,
      recoveryKeyHash: recoveryHash('recovery-code-user-2'),
      avatarSeed: 'wanderer_42',
      preferences: { theme: 'light', notificationsEnabled: false, dailyReadingTargetMinutes: 45 },
      currentStreak: 12,
      longestStreak: 14,
      lastReadDate: new Date(),
    },
  });

  const user3 = await prisma.user.create({
    data: {
      biDanh: 'dem_muon_doc_sach',
      passwordHash,
      recoveryKeyHash: recoveryHash('recovery-code-user-3'),
      avatarSeed: 'night_owl_88',
      preferences: { theme: 'dark', notificationsEnabled: true, dailyReadingTargetMinutes: 60 },
      currentStreak: 3,
      longestStreak: 8,
      lastReadDate: new Date(),
    },
  });

  console.log('👤 Created 3 demo users (password: novoli@2026!)');

  // ─── 3. Shelves & Progress Seed ──────────────────────────────────────────
  await prisma.shelf.createMany({
    data: [
      {
        userId: user1.id,
        bookId: createdBooks[0].id, // Tuổi trẻ đáng giá bao nhiêu
        type: ShelfType.READ,
        currentPage: 292,
        startedAt: new Date(Date.now() - 30 * 86400000),
        finishedAt: new Date(Date.now() - 15 * 86400000),
      },
      {
        userId: user1.id,
        bookId: createdBooks[2].id, // Rừng Na Uy
        type: ShelfType.CURRENTLY_READING,
        currentPage: 210,
        startedAt: new Date(Date.now() - 5 * 86400000),
      },
      {
        userId: user1.id,
        bookId: createdBooks[3].id, // 1984
        type: ShelfType.WANT_TO_READ,
        currentPage: 0,
      },
      {
        userId: user2.id,
        bookId: createdBooks[4].id, // Nhà Giả Kim
        type: ShelfType.READ,
        currentPage: 228,
        startedAt: new Date(Date.now() - 20 * 86400000),
        finishedAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        userId: user2.id,
        bookId: createdBooks[5].id, // Sapiens
        type: ShelfType.CURRENTLY_READING,
        currentPage: 340,
        startedAt: new Date(Date.now() - 8 * 86400000),
      },
      {
        userId: user3.id,
        bookId: createdBooks[7].id, // Cây Cam Ngọt Của Tôi
        type: ShelfType.READ,
        currentPage: 244,
        startedAt: new Date(Date.now() - 7 * 86400000),
        finishedAt: new Date(Date.now() - 2 * 86400000),
      },
    ],
  });
  console.log('📖 Populated user bookshelves & progress.');

  // ─── 4. Reading Logs Seed (for streak & analytics) ─────────────────────────
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const logDate = new Date(now.getTime() - i * 86400000);
    await prisma.readingLog.create({
      data: {
        clientLogId: crypto.randomUUID(),
        userId: user1.id,
        bookId: createdBooks[2].id,
        startPage: i * 30,
        endPage: (i + 1) * 30,
        pagesRead: 30,
        durationMinutes: 35,
        note: `Đọc buổi tối yên tĩnh ngày ${logDate.toLocaleDateString('vi-VN')}`,
        loggedAt: logDate,
      },
    });
  }
  console.log('⏱️ Generated reading logs for streak analysis.');

  // ─── 5. Goals Seed ────────────────────────────────────────────────────────
  await prisma.goal.createMany({
    data: [
      {
        userId: user1.id,
        year: 2026,
        targetBooks: 24,
        completedBooks: 8,
        targetPages: 6000,
        completedPages: 2150,
        status: GoalStatus.ACTIVE,
      },
      {
        userId: user2.id,
        year: 2026,
        targetBooks: 30,
        completedBooks: 12,
        targetPages: 8000,
        completedPages: 3600,
        status: GoalStatus.ACTIVE,
      },
      {
        userId: user3.id,
        year: 2026,
        targetBooks: 15,
        completedBooks: 4,
        targetPages: 4500,
        completedPages: 1100,
        status: GoalStatus.ACTIVE,
      },
    ],
  });
  console.log('🎯 Created reading goals for 2026.');

  // ─── 6. Reviews Seed ──────────────────────────────────────────────────────
  await prisma.review.createMany({
    data: [
      {
        userId: user1.id,
        bookId: createdBooks[0].id,
        rating: 5,
        content: 'Một cuốn sách tuyệt vời tiếp thêm động lực cho những ngày hoang mang của tuổi đôi mươi.',
        hasSpoilers: false,
        isAnonymous: false,
        likesCount: 18,
      },
      {
        userId: user2.id,
        bookId: createdBooks[4].id,
        rating: 5,
        content: 'Khi bạn khao khát một điều gì đó, cả vũ trụ sẽ hợp lực giúp bạn đạt được điều đó.',
        hasSpoilers: false,
        isAnonymous: false,
        likesCount: 34,
      },
      {
        userId: user3.id,
        bookId: createdBooks[7].id,
        rating: 5,
        content: 'Cuốn sách làm mình khóc nức nở lúc nửa đêm. Tình cảm ấm áp của ông Bồ và nỗi cô đơn của chú bé Zezé.',
        hasSpoilers: true,
        isAnonymous: true,
        anonymousAlias: 'Người Đọc Giấu Mặt #77',
        likesCount: 42,
      },
    ],
  });
  console.log('⭐ Created sample book reviews.');

  // ─── 7. Anonymous Forum Threads & Nested Posts ────────────────────────────
  // Note: Thread & Post authorHash is decoupled from userId via HMAC!
  const secret = process.env.FORUM_ANONYMOUS_SECRET || 'secret-salt-key-for-local-demo';
  const getHash = (uid: string, tid: string) =>
    crypto.createHmac('sha256', secret).update(`${uid}:${tid}`).digest('hex');

  const thread1 = await prisma.thread.create({
    data: {
      bookId: createdBooks[3].id, // 1984
      title: 'Ý nghĩa thực sự của căn phòng 101 và cái kết của Winston Smith?',
      content: 'Sau khi đọc xong 1984 của Orwell, mình cảm thấy choáng ngợp trước cái kết. Liệu O’Brien thực sự đã biến đổi hoàn toàn tư tưởng của Winston, hay đó chỉ là sự khuất phục sinh học?',
      tags: ['1984', 'GeorgeOrwell', 'PhânTích', 'TriếtHọc'],
      hasSpoilers: true,
      authorHash: getHash(user1.id, 'thread-1984'),
      displayAlias: 'Kẻ Hoài Nghi #9A1',
      viewsCount: 156,
      postsCount: 2,
    },
  });

  const opPost = await prisma.post.create({
    data: {
      threadId: thread1.id,
      content: 'Đặc biệt là chi tiết con chuột - nỗi sợ nguyên thủy nhất bị đem ra làm công cụ ép cung.',
      hasSpoilers: true,
      authorHash: getHash(user1.id, 'thread-1984'),
      displayAlias: 'Kẻ Hoài Nghi #9A1',
      isOp: true,
      upvotes: 9,
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread1.id,
      parentPostId: opPost.id,
      content: 'Chính xác! Căn phòng 101 không chỉ là tra tấn thể xác, mà là bẻ gãy nhân tính cuối cùng. Khi Winston hét lên "Hãy làm điều đó với Julia!", anh ta đã tự tay hủy diệt bản ngã của mình.',
      hasSpoilers: true,
      authorHash: getHash(user2.id, 'thread-1984'),
      displayAlias: 'Cú Đêm Đọc Sách #B42',
      isOp: false,
      upvotes: 14,
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      bookId: createdBooks[2].id, // Rừng Na Uy
      title: 'Toru Watanabe thực sự yêu Naoko hay Midori?',
      content: 'Cuộc đấu tranh nội tâm giữa quá khứ u buồn gắn liền với cái chết (Naoko) và sức sống tươi mới của hiện tại (Midori). Mọi người cảm nhận thế nào?',
      tags: ['RừngNaUy', 'Murakami', 'ThảoLuận'],
      hasSpoilers: false,
      authorHash: getHash(user3.id, 'thread-norwegian'),
      displayAlias: 'Tri Kỷ Văn Chương #C88',
      viewsCount: 280,
      postsCount: 1,
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread2.id,
      content: 'Midori đại diện cho sự sống và thực tại, còn Naoko là hoài niệm và thế giới bên kia. Watanabe đã lạc giữa hai lằn ranh đó suốt những năm tháng tuổi trẻ.',
      hasSpoilers: false,
      authorHash: getHash(user1.id, 'thread-norwegian'),
      displayAlias: 'Người Lữ Hành #D12',
      isOp: false,
      upvotes: 21,
    },
  });

  console.log('💬 Created privacy-safe anonymous threads and nested replies.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
