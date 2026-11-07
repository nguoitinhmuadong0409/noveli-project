process.env.NODE_ENV = 'test';

import http from 'http';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

let server: http.Server;
let baseUrl: string;
const testUsernames = [`chat_a_${Date.now()}`, `chat_b_${Date.now()}`, `chat_c_${Date.now()}`, `chat_d_${Date.now()}`];

test.before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.user.deleteMany({ where: { biDanh: { in: testUsernames } } });
  await prisma.$disconnect();
});

test('Chat API enforces membership and group-admin permissions', async () => {
  const tokens: string[] = [];
  for (const biDanh of testUsernames) {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biDanh, password: 'Password@Chat123' }),
    });
    assert.equal(response.status, 201);
    tokens.push((await response.json() as { accessToken: string }).accessToken);
  }

  const request = (token: string, method: string, path: string, body?: unknown) => fetch(`${baseUrl}/api/v1/chat${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const directResponse = await request(tokens[0], 'POST', '/conversations/direct', { biDanh: testUsernames[1] });
  assert.equal(directResponse.status, 201);
  const directId = (await directResponse.json() as { conversationId: string }).conversationId;
  const duplicateDirectResponse = await request(tokens[1], 'POST', '/conversations/direct', { biDanh: testUsernames[0] });
  assert.equal(duplicateDirectResponse.status, 200);
  assert.equal((await duplicateDirectResponse.json() as { conversationId: string }).conversationId, directId);

  assert.equal((await request(tokens[2], 'GET', `/conversations/${directId}/messages`)).status, 404);
  assert.equal((await request(tokens[2], 'POST', `/conversations/${directId}/messages`, { content: 'Không thuộc cuộc trò chuyện' })).status, 404);

  const groupResponse = await request(tokens[0], 'POST', '/conversations/groups', {
    name: 'Nhóm đọc sách',
    members: [testUsernames[1], testUsernames[2]],
  });
  assert.equal(groupResponse.status, 201);
  const groupId = (await groupResponse.json() as { conversationId: string }).conversationId;
  assert.equal((await request(tokens[3], 'GET', `/conversations/${groupId}/messages`)).status, 404);
  assert.equal((await request(tokens[1], 'POST', `/conversations/${groupId}/members`, { members: [testUsernames[3]] })).status, 404);
  assert.equal((await request(tokens[0], 'POST', `/conversations/${groupId}/members`, { members: [testUsernames[3]] })).status, 201);

  const sendResponse = await request(tokens[0], 'POST', `/conversations/${groupId}/messages`, { content: 'Xin chào cả nhóm!' });
  assert.equal(sendResponse.status, 201);
  const messagesResponse = await request(tokens[2], 'GET', `/conversations/${groupId}/messages`);
  assert.equal(messagesResponse.status, 200);
  const data = await messagesResponse.json() as { messages: Array<{ content: string; sender: { biDanh: string } }> };
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].content, 'Xin chào cả nhóm!');
  assert.equal(data.messages[0].sender.biDanh, testUsernames[0]);
});
