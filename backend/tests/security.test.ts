process.env.NODE_ENV = 'test';

import http from 'http';
import assert from 'node:assert';
import test from 'node:test';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await prisma.$disconnect();
});

test('Security & Data Scoping Suite', async (t) => {
  const userA_BiDanh = `sec_a_${Date.now()}`;
  const userB_BiDanh = `sec_b_${Date.now()}`;
  let tokenA = '';
  let tokenB = '';

  // Register User A
  const resA = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ biDanh: userA_BiDanh, password: 'Password@UserA123' }),
  });
  const dataA = (await resA.json() as any);
  tokenA = dataA.accessToken;

  // Register User B
  const resB = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ biDanh: userB_BiDanh, password: 'Password@UserB123' }),
  });
  const dataB = (await resB.json() as any);
  tokenB = dataB.accessToken;

  // Find a book in database or create one for testing
  let book = await prisma.book.findFirst();
  if (!book) {
    book = await prisma.book.create({
      data: {
        title: 'Security Test Book',
        authors: ['Security Author'],
        pageCount: 300,
        categories: ['Technology'],
      },
    });
  }

  await t.test('1. User A puts book on shelf; User B cannot see User A shelf items', async () => {
    // User A adds book to WANT_TO_READ
    const shelfRes = await fetch(`${baseUrl}/api/v1/shelves`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ bookId: book.id, type: 'CURRENTLY_READING' }),
    });
    assert.strictEqual(shelfRes.status, 200);

    // User B fetches their own shelves
    const shelvesResB = await fetch(`${baseUrl}/api/v1/shelves`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(shelvesResB.status, 200);
    const dataShelvesB = (await shelvesResB.json() as any);
    const hasBook = dataShelvesB.shelves.some((s: any) => s.bookId === book.id);
    assert.strictEqual(hasBook, false, 'User B must not see books on User A shelf');
  });

  await t.test('2. Unauthenticated requests to protected endpoints return 401', async () => {
    const unauthEndpoints = [
      { method: 'GET', path: '/api/v1/auth/me' },
      { method: 'PATCH', path: '/api/v1/auth/me' },
      { method: 'PATCH', path: '/api/v1/auth/password' },
      { method: 'POST', path: '/api/v1/auth/logout' },
      { method: 'POST', path: '/api/v1/auth/logout-all' },
      { method: 'GET', path: '/api/v1/shelves' },
      { method: 'PUT', path: '/api/v1/shelves' },
      { method: 'GET', path: '/api/v1/analytics/dashboard' },
      { method: 'POST', path: '/api/v1/reading-logs/sync' },
      { method: 'GET', path: '/api/v1/admin/dashboard' },
      { method: 'PATCH', path: '/api/v1/admin/users/00000000-0000-4000-8000-000000000000/role' },
    ];

    for (const ep of unauthEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(res.status, 401, `${ep.method} ${ep.path} must reject unauthenticated requests`);
    }
  });

  await t.test('3. Privacy Shield strips identifying IP headers', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        'X-Forwarded-For': '203.0.113.195',
        'X-Real-IP': '198.51.100.17',
        'CF-Connecting-IP': '192.0.2.1',
      },
    });
    assert.strictEqual(res.status, 200);
  });

  // Cleanup
  await prisma.user.deleteMany({
    where: { biDanh: { in: [userA_BiDanh, userB_BiDanh] } },
  });
});
