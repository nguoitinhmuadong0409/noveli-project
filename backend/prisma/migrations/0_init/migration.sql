-- CreateEnum
CREATE TYPE "ShelfType" AS ENUM ('WANT_TO_READ', 'CURRENTLY_READING', 'READ', 'DID_NOT_FINISH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "biDanh" VARCHAR(30) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "recoveryKeyHash" TEXT NOT NULL,
    "avatarSeed" VARCHAR(64) NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastReadDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "deviceType" VARCHAR(32) NOT NULL DEFAULT 'web',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "reminderTime" VARCHAR(5),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "googleBookId" VARCHAR(32),
    "isbn13" CHAR(13),
    "title" VARCHAR(512) NOT NULL,
    "authors" TEXT[],
    "description" TEXT,
    "coverUrl" TEXT,
    "pageCount" INTEGER,
    "categories" TEXT[],
    "publishedDate" VARCHAR(20),
    "avgRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "type" "ShelfType" NOT NULL DEFAULT 'WANT_TO_READ',
    "customShelfName" VARCHAR(100),
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "anonymousAlias" VARCHAR(60),
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" UUID NOT NULL,
    "bookId" UUID,
    "title" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "authorHash" CHAR(64) NOT NULL,
    "displayAlias" VARCHAR(80) NOT NULL,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "parentPostId" UUID,
    "content" TEXT NOT NULL,
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "authorHash" CHAR(64) NOT NULL,
    "displayAlias" VARCHAR(80) NOT NULL,
    "isOp" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_logs" (
    "id" UUID NOT NULL,
    "clientLogId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "pagesRead" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "targetBooks" INTEGER NOT NULL DEFAULT 12,
    "completedBooks" INTEGER NOT NULL DEFAULT 0,
    "targetPages" INTEGER,
    "completedPages" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_biDanh_key" ON "users"("biDanh");

-- CreateIndex
CREATE INDEX "users_biDanh_idx" ON "users"("biDanh");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_reminderTime_isActive_idx" ON "push_subscriptions"("reminderTime", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "books_googleBookId_key" ON "books"("googleBookId");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn13_key" ON "books"("isbn13");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_avgRating_idx" ON "books"("avgRating");

-- CreateIndex
CREATE INDEX "shelves_userId_type_idx" ON "shelves"("userId", "type");

-- CreateIndex
CREATE INDEX "shelves_bookId_idx" ON "shelves"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "shelves_userId_bookId_key" ON "shelves"("userId", "bookId");

-- CreateIndex
CREATE INDEX "reviews_bookId_createdAt_idx" ON "reviews"("bookId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reviews_bookId_rating_idx" ON "reviews"("bookId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_bookId_key" ON "reviews"("userId", "bookId");

-- CreateIndex
CREATE INDEX "threads_bookId_createdAt_idx" ON "threads"("bookId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "threads_createdAt_idx" ON "threads"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_threadId_createdAt_idx" ON "posts"("threadId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "posts_parentPostId_idx" ON "posts"("parentPostId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_logs_clientLogId_key" ON "reading_logs"("clientLogId");

-- CreateIndex
CREATE INDEX "reading_logs_userId_loggedAt_idx" ON "reading_logs"("userId", "loggedAt" DESC);

-- CreateIndex
CREATE INDEX "reading_logs_userId_bookId_idx" ON "reading_logs"("userId", "bookId");

-- CreateIndex
CREATE INDEX "goals_userId_year_idx" ON "goals"("userId", "year" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "goals_userId_year_key" ON "goals"("userId", "year");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_logs" ADD CONSTRAINT "reading_logs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

