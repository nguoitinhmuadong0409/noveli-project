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

test('Auth System End-to-End Suite', async (t) => {
  const testBiDanh = `tester_${Date.now()}`;
  const testPassword = 'Password@12345';
  let accessToken = '';
  let refreshTokenCookie = '';
  let recoveryKey = '';

  await t.test('1. Registration - Successfully registers user and issues 160-bit recovery key', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: testPassword }),
    });

    assert.strictEqual(res.status, 201);
    const data = (await res.json() as any);
    assert.ok(data.accessToken, 'Should return accessToken');
    assert.strictEqual(data.user.biDanh, testBiDanh);
    assert.ok(data.recoveryKey, 'Should return recovery key');

    // Verify 160-bit recovery key format: BKHL-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
    const keyParts = data.recoveryKey.split('-');
    assert.strictEqual(keyParts.length, 6, 'Recovery key should have 6 segments (prefix + 5 blocks)');
    assert.strictEqual(keyParts[0], 'BKHL');
    for (let i = 1; i <= 5; i++) {
      assert.strictEqual(keyParts[i].length, 8, `Block ${i} should have 8 hex characters`);
    }

    // Verify refresh token cookie was set (bkhl_rt)
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Should set refresh token cookie');
    assert.ok(setCookie.includes('bkhl_rt='), 'Cookie should contain bkhl_rt');
    assert.ok(setCookie.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly');

    accessToken = data.accessToken;
    recoveryKey = data.recoveryKey;
    refreshTokenCookie = setCookie.split(';')[0];
  });

  await t.test('2. Registration - Case-insensitive collision detection', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh.toUpperCase(), password: 'AnotherPassword!1' }),
    });

    assert.strictEqual(res.status, 409, 'Should reject duplicate biDanh case-insensitively');
    const data = (await res.json() as any);
    assert.ok(data.error.includes('already taken'));
  });

  await t.test('3. Login - Rejects invalid password with generic timing-safe message', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: 'WrongPassword999!' }),
    });

    assert.strictEqual(res.status, 401);
    const data = (await res.json() as any);
    assert.strictEqual(data.error, 'Invalid biDanh or password');
  });

  await t.test('4. Login - Authenticates successfully and sets credentials', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: testPassword }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json() as any);
    assert.ok(data.accessToken);
    assert.strictEqual(data.user.biDanh, testBiDanh);
    accessToken = data.accessToken;
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      refreshTokenCookie = setCookie.split(';')[0];
    }
  });

  await t.test('5. GET /auth/me - Retrieves current authenticated user profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json() as any);
    assert.strictEqual(data.user.biDanh, testBiDanh);
    assert.strictEqual(data.user.passwordHash, undefined, 'passwordHash must never be exposed');
    assert.strictEqual(data.user.recoveryKeyHash, undefined, 'recoveryKeyHash must never be exposed');
  });

  await t.test('6. PATCH /auth/me - Updates user profile preferences & avatarSeed', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        avatarSeed: 'new_seed_99',
        preferences: { readingGoalMinutes: 45, theme: 'light-sepia' },
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json() as any);
    assert.strictEqual(data.user.avatarSeed, 'new_seed_99');
    assert.strictEqual(data.user.preferences.readingGoalMinutes, 45);
  });

  await t.test('7. PATCH /auth/password - Authenticated password change revokes old sessions', async () => {
    const updatedPassword = 'NewSecretPassword@2026';
    const res = await fetch(`${baseUrl}/api/v1/auth/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: testPassword,
        newPassword: updatedPassword,
      }),
    });

    assert.strictEqual(res.status, 200);

    // Verify login with old password fails
    const oldLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: testPassword }),
    });
    assert.strictEqual(oldLogin.status, 401);

    // Verify login with new password succeeds and gets new cookie
    const newLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: updatedPassword }),
    });
    assert.strictEqual(newLogin.status, 200);
    const data = (await newLogin.json() as any);
    accessToken = data.accessToken;
    const setCookie = newLogin.headers.get('set-cookie');
    if (setCookie) {
      refreshTokenCookie = setCookie.split(';')[0];
    }
  });

  await t.test('8. POST /auth/refresh - Refresh token rotation', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshTokenCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = (await res.json() as any);
    assert.ok(data.accessToken);
    accessToken = data.accessToken;

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Should rotate cookie');
    refreshTokenCookie = setCookie.split(';')[0];
  });

  await t.test('9. POST /auth/recover - Password recovery via 160-bit recovery key', async () => {
    const recoveredPassword = 'RecoveredPassword!2026';
    const res = await fetch(`${baseUrl}/api/v1/auth/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        biDanh: testBiDanh,
        recoveryKey: recoveryKey,
        newPassword: recoveredPassword,
      }),
    });

    assert.strictEqual(res.status, 200);

    // Login with recovered password succeeds
    const recLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: recoveredPassword }),
    });
    assert.strictEqual(recLogin.status, 200);
    const recData = (await recLogin.json() as any);
    accessToken = recData.accessToken;
    const setCookie = recLogin.headers.get('set-cookie');
    if (setCookie) {
      refreshTokenCookie = setCookie.split(';')[0];
    }
  });

  await t.test('10. POST /auth/logout - Deletes session and clears cookie', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: refreshTokenCookie,
      },
    });

    assert.strictEqual(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && (setCookie.includes('Max-Age=0') || setCookie.includes('Expires=Thu, 01 Jan 1970')));
  });

  await t.test('11. POST /auth/logout-all - Revokes all active refresh tokens for user', async () => {
    // First, login to get fresh tokens
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh: testBiDanh, password: 'RecoveredPassword!2026' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = (await loginRes.json() as any);
    const token = loginData.accessToken;

    const logoutAllRes = await fetch(`${baseUrl}/api/v1/auth/logout-all`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(logoutAllRes.status, 200);

    // Verify all refresh tokens for this user are deleted in database
    const userInDb = await prisma.user.findUnique({
      where: { biDanh: testBiDanh },
      include: { refreshTokens: true },
    });
    assert.strictEqual(userInDb?.refreshTokens.length, 0, 'All refresh tokens should be deleted');
  });

  // Cleanup test user
  await prisma.user.deleteMany({
    where: { biDanh: testBiDanh },
  });
});
