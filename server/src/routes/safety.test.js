import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { io as ClientIO } from 'socket.io-client';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';
import registerChatSocket from '../sockets/chat.socket.js';

describe('Safety Endpoints & Blocking Effects Integration Tests (Step 13)', () => {
  let server;
  let socketServer;
  let serverPort;

  // Helper to generate auth cookie
  const getAuthCookie = (user) => {
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || 'student',
        email_verified: Boolean(user.email_verified),
        profile_completed: Boolean(user.profile_completed),
      },
      config.jwt.secret,
      { expiresIn: '1d' }
    );
    return `token=${token}; Path=/; HttpOnly`;
  };

  const getAuthToken = (user) => {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || 'student',
        email_verified: Boolean(user.email_verified),
        profile_completed: Boolean(user.profile_completed),
      },
      config.jwt.secret,
      { expiresIn: '1d' }
    );
  };

  beforeAll(async () => {
    await db.migrate.latest();

    // Start HTTP server for supertest and socket.io client testing
    server = http.createServer(app);
    socketServer = new SocketIOServer(server, {
      cors: { origin: '*' },
    });
    registerChatSocket(socketServer);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (socketServer) {
      await new Promise((resolve) => socketServer.close(resolve));
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    // Clean all related tables before each test
    await db('reports').del();
    await db('blocks').del();
    await db('messages').del();
    await db('conversations').del();
    await db('match_results').del();
    await db('requirements').del();
    await db('profiles').del();
    await db('users').del();
  });

  // Helper to create test user with complete profile and requirement
  const createTestUser = async ({ email, fullName, gender = 'male', city = 'Bhopal' }) => {
    const [userId] = await db('users').insert({
      email,
      password_hash: 'hashed_password_12345',
      role: 'student',
      status: 'active',
      email_verified: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('profiles').insert({
      user_id: userId,
      full_name: fullName,
      age: 21,
      gender,
      college_name: 'MANIT Bhopal',
      major: 'Computer Science',
      graduation_year: 2026,
      city,
      sleep_schedule: 'early_bird',
      cleanliness_level: 4,
      study_habits: 'silent',
      noise_level: 'quiet',
      smoking_preference: 'no',
      drinking_preference: 'no',
      food_preference: 'vegetarian',
      pet_preference: 'no_pets',
      guest_policy: 'rarely',
      bio: `Hello, I am ${fullName}`,
      profile_completed: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('requirements').insert({
      user_id: userId,
      city,
      budget_min: 5000,
      budget_max: 10000,
      gender_preference: 'any',
      preferred_cleanliness_min: 3,
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await db('users').where({ id: userId }).first();
  };

  describe('POST /api/blocks', () => {
    it('successfully blocks another user and returns 201', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      const res = await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id, reason: 'Inappropriate behavior' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.blocked_user_id).toBe(userB.id);

      // Verify row in blocks table
      const blockRow = await db('blocks')
        .where({ blocker_id: userA.id, blocked_id: userB.id })
        .first();
      expect(blockRow).toBeDefined();
      expect(blockRow.reason).toBe('Inappropriate behavior');
    });

    it('rejects self-blocking with 400 CANNOT_BLOCK_SELF', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });

      const res = await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userA.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_BLOCK_SELF');
    });

    it('returns 404 USER_NOT_FOUND when trying to block non-existent user', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });

      const res = await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: 999999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('handles idempotent blocking if user is already blocked', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // First block
      await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id });

      // Second block
      const res2 = await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id });

      expect(res2.status).toBe(201);
      expect(res2.body.success).toBe(true);
    });
  });

  describe('DELETE /api/blocks/:userId', () => {
    it('successfully unblocks a previously blocked user', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // Insert block
      await db('blocks').insert({
        blocker_id: userA.id,
        blocked_id: userB.id,
      });

      const res = await request(app)
        .delete(`/api/blocks/${userB.id}`)
        .set('Cookie', getAuthCookie(userA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const blockRow = await db('blocks')
        .where({ blocker_id: userA.id, blocked_id: userB.id })
        .first();
      expect(blockRow).toBeUndefined();
    });

    it('returns 404 BLOCK_NOT_FOUND when unblocking a user who is not blocked', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      const res = await request(app)
        .delete(`/api/blocks/${userB.id}`)
        .set('Cookie', getAuthCookie(userA));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BLOCK_NOT_FOUND');
    });
  });

  describe('GET /api/blocks', () => {
    it('lists blocked users showing display names and avatars only with strict privacy', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });
      const userC = await createTestUser({ email: 'userC@manit.ac.in', fullName: 'Student C' });

      await db('blocks').insert([
        { blocker_id: userA.id, blocked_id: userB.id },
        { blocker_id: userA.id, blocked_id: userC.id },
      ]);

      const res = await request(app)
        .get('/api/blocks')
        .set('Cookie', getAuthCookie(userA));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.blocks).toHaveLength(2);

      const blockedUserIds = res.body.blocks.map((b) => b.blocked_user_id);
      expect(blockedUserIds).toContain(userB.id);
      expect(blockedUserIds).toContain(userC.id);

      // Verify display names are present
      const displayNames = res.body.blocks.map((b) => b.display_name);
      expect(displayNames).toContain('Student B');
      expect(displayNames).toContain('Student C');

      // STRICT PRIVACY: verify email and phone are NEVER present in any blocked object
      res.body.blocks.forEach((item) => {
        expect(item).not.toHaveProperty('email');
        expect(item).not.toHaveProperty('phone');
        expect(item).not.toHaveProperty('password_hash');
      });
    });
  });

  describe('Blocking Effects on Matches (Cached & Read-Time)', () => {
    it('removes both users from each others cached match_results and filters at read-time in GET /api/matches', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // Seed match results for both users
      await db('match_results').insert([
        {
          user_id: userA.id,
          matched_user_id: userB.id,
          compatibility_score: 92,
          score_breakdown: JSON.stringify({ budget: 100 }),
          status: 'suggested',
        },
        {
          user_id: userB.id,
          matched_user_id: userA.id,
          compatibility_score: 92,
          score_breakdown: JSON.stringify({ budget: 100 }),
          status: 'suggested',
        },
      ]);

      // Before blocking: userA can see userB in matches
      const beforeRes = await request(app)
        .get('/api/matches')
        .set('Cookie', getAuthCookie(userA));
      expect(beforeRes.status).toBe(200);
      expect(beforeRes.body.matches.some((m) => m.candidate_id === userB.id)).toBe(true);

      // User A blocks User B via POST /api/blocks
      const blockRes = await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id });
      expect(blockRes.status).toBe(201);

      // Verify match_results rows were removed from DB
      const remainingMatches = await db('match_results')
        .where(function () {
          this.where({ user_id: userA.id, matched_user_id: userB.id })
            .orWhere({ user_id: userB.id, matched_user_id: userA.id });
        });
      expect(remainingMatches).toHaveLength(0);

      // Verify GET /api/matches for User A returns no matches
      const afterResA = await request(app)
        .get('/api/matches')
        .set('Cookie', getAuthCookie(userA));
      expect(afterResA.status).toBe(200);
      expect(afterResA.body.matches.some((m) => m.candidate_id === userB.id)).toBe(false);

      // Verify GET /api/matches for User B also returns no matches
      const afterResB = await request(app)
        .get('/api/matches')
        .set('Cookie', getAuthCookie(userB));
      expect(afterResB.status).toBe(200);
      expect(afterResB.body.matches.some((m) => m.candidate_id === userA.id)).toBe(false);
    });

    it('unblocking does NOT immediately re-add the user to cached matches until matching runs again', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // User A blocks User B
      await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id });

      // User A unblocks User B
      const unblockRes = await request(app)
        .delete(`/api/blocks/${userB.id}`)
        .set('Cookie', getAuthCookie(userA));
      expect(unblockRes.status).toBe(200);

      // Check match_results table: still empty because matching has not re-run!
      const matchRows = await db('match_results').where({ user_id: userA.id });
      expect(matchRows).toHaveLength(0);
    });
  });

  describe('Blocking Effects on Conversations, Chat & Contact Sharing', () => {
    it('makes the conversation read-only: messages cannot be sent and contact cannot be fetched', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // Create conversation between userA and userB
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', getAuthCookie(userA))
        .send({ candidate_user_id: userB.id });
      expect(convRes.status).toBe(201);
      const convId = convRes.body.conversation.id;

      // Both users share contact
      await db('conversations').where({ id: convId }).update({
        a_shares_contact: 1,
        b_shares_contact: 1,
      });

      // Send initial message
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', getAuthCookie(userA))
        .send({ content: 'Hello before block!' });

      // User A blocks User B
      await request(app)
        .post('/api/blocks')
        .set('Cookie', getAuthCookie(userA))
        .send({ blocked_user_id: userB.id });

      // 1. Reading messages history still succeeds and indicates is_blocked: true
      const getHistoryRes = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', getAuthCookie(userA));
      expect(getHistoryRes.status).toBe(200);
      expect(getHistoryRes.body.is_blocked).toBe(true);
      expect(getHistoryRes.body.messages).toHaveLength(1);

      // 2. Sending a new message by User A fails with 403 CONVERSATION_BLOCKED
      const sendFromARes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', getAuthCookie(userA))
        .send({ content: 'Attempt to send while blocked' });
      expect(sendFromARes.status).toBe(403);
      expect(sendFromARes.body.error.code).toBe('CONVERSATION_BLOCKED');

      // 3. Sending a new message by User B also fails with 403 CONVERSATION_BLOCKED
      const sendFromBRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', getAuthCookie(userB))
        .send({ content: 'Attempt to reply while blocked' });
      expect(sendFromBRes.status).toBe(403);
      expect(sendFromBRes.body.error.code).toBe('CONVERSATION_BLOCKED');

      // 4. Contact details CANNOT be fetched even though both shared flags were 1
      const contactRes = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', getAuthCookie(userA));
      expect(contactRes.status).toBe(403);
      expect(contactRes.body.error.code).toBe('CONTACT_NOT_SHARED');

      // 5. Unblocking restores access to the old conversation
      await request(app)
        .delete(`/api/blocks/${userB.id}`)
        .set('Cookie', getAuthCookie(userA));

      // Sending messages works again
      const sendAfterUnblockRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', getAuthCookie(userA))
        .send({ content: 'Hello again after unblock!' });
      expect(sendAfterUnblockRes.status).toBe(201);
    });

    it('refuses real-time message delivery over Socket.IO when conversation is blocked', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // Create conversation
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', getAuthCookie(userA))
        .send({ candidate_user_id: userB.id });
      const convId = convRes.body.conversation.id;

      // Block User B
      await db('blocks').insert({
        blocker_id: userA.id,
        blocked_id: userB.id,
      });

      // Connect Socket.IO client as User B
      const tokenB = getAuthToken(userB);
      const clientSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: tokenB },
        transports: ['websocket'],
      });

      await new Promise((resolve) => clientSocket.on('connect', resolve));

      // Attempt to send message over socket
      const socketAck = await new Promise((resolve) => {
        clientSocket.emit(
          'send_message',
          {
            conversation_id: convId,
            content: 'Socket message in blocked chat',
          },
          (response) => {
            resolve(response);
          }
        );
      });

      expect(socketAck).toBeDefined();
      expect(socketAck.error).toBeDefined();
      expect(socketAck.error.code).toBe('CONVERSATION_BLOCKED');

      clientSocket.disconnect();
    });
  });

  describe('POST /api/reports (Report Validation & Limit)', () => {
    it('successfully submits a report with valid PRD enum reason and optional details', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', getAuthCookie(userA))
        .send({
          reported_user_id: userB.id,
          reason: 'harassment',
          details: 'Used inappropriate language in direct messages.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reported_user_id).toBe(userB.id);

      const reportRow = await db('reports')
        .where({ reporter_id: userA.id, reported_id: userB.id })
        .first();
      expect(reportRow).toBeDefined();
      expect(reportRow.reason).toBe('harassment');
      expect(reportRow.details).toBe('Used inappropriate language in direct messages.');
      expect(reportRow.status).toBe('pending');
    });

    it('accepts all valid PRD enum reasons: fake_profile, inappropriate_content, spam, other', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      for (const reason of ['fake_profile', 'inappropriate_content', 'spam', 'other']) {
        const res = await request(app)
          .post('/api/reports')
          .set('Cookie', getAuthCookie(userA))
          .send({
            reported_user_id: userB.id,
            reason,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      }
    });

    it('rejects invalid reason enum with 400', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', getAuthCookie(userA))
        .send({
          reported_user_id: userB.id,
          reason: 'invalid_reason_code',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects details exceeding 500 characters with 400', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      const longDetails = 'A'.repeat(501);

      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', getAuthCookie(userA))
        .send({
          reported_user_id: userB.id,
          reason: 'harassment',
          details: longDetails,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects self-report with 400 CANNOT_REPORT_SELF', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });

      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', getAuthCookie(userA))
        .send({
          reported_user_id: userA.id,
          reason: 'spam',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_REPORT_SELF');
    });

    it('enforces limit of 10 reports per day per user and rejects 11th with 429 REPORT_LIMIT_EXCEEDED', async () => {
      const userA = await createTestUser({ email: 'userA@manit.ac.in', fullName: 'Student A' });
      const userB = await createTestUser({ email: 'userB@manit.ac.in', fullName: 'Student B' });

      // Seed 10 existing reports from userA in the last hour
      const reports = Array.from({ length: 10 }, (_, i) => ({
        reporter_id: userA.id,
        reported_id: userB.id,
        reason: 'spam',
        details: `Report ${i + 1}`,
        status: 'pending',
        created_at: new Date(Date.now() - (i + 1) * 60000),
      }));

      await db('reports').insert(reports);

      // Attempt 11th report
      const res = await request(app)
        .post('/api/reports')
        .set('Cookie', getAuthCookie(userA))
        .send({
          reported_user_id: userB.id,
          reason: 'harassment',
          details: 'Eleventh report attempt',
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('REPORT_LIMIT_EXCEEDED');
    });
  });
});

