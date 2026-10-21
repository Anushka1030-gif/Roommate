import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';
import { socketAuthMiddleware } from '../sockets/chat.socket.js';

describe('Conversations and Chat Backend Integration Tests (/api/conversations)', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    await db('messages').del();
    await db('conversations').del();
    await db('blocks').del();
    await db('profiles').del();
    await db('users').del();
  });

  async function createTestStudent({
    email = 'student1@manit.ac.in',
    full_name = 'Test Student',
    email_verified = true,
    profile_complete = true,
    city = 'Bhopal',
  } = {}) {
    const passwordHash = await bcrypt.hash('SecurePassword123!', 4);
    const [userId] = await db('users').insert({
      email,
      password_hash: passwordHash,
      role: 'student',
      email_verified,
      status: 'active',
    });

    await db('profiles').insert({
      user_id: userId,
      full_name,
      age: profile_complete ? 21 : null,
      gender: profile_complete ? 'male' : null,
      college_name: profile_complete ? 'MANIT Bhopal' : null,
      major: profile_complete ? 'Computer Science' : null,
      graduation_year: profile_complete ? 2026 : null,
      city: profile_complete ? city : null,
      sleep_schedule: profile_complete ? 'early_bird' : null,
      cleanliness_level: profile_complete ? 4 : null,
      study_habits: profile_complete ? 'silent' : null,
      noise_level: profile_complete ? 'quiet' : null,
      smoking_preference: profile_complete ? 'no' : null,
      drinking_preference: profile_complete ? 'no' : null,
      food_preference: profile_complete ? 'vegetarian' : null,
      pet_preference: profile_complete ? 'no_pets' : null,
      guest_policy: profile_complete ? 'rarely' : null,
      bio: profile_complete ? 'CS student seeking tidy roommate' : null,
      profile_completed: profile_complete,
    });

    const token = jwt.sign(
      { id: userId, email, role: 'student' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
    const cookie = `token=${token}`;

    return { userId, token, cookie };
  }

  describe('Route Guards and Authorization', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/conversations');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks unverified users with 403 EMAIL_NOT_VERIFIED', async () => {
      const { cookie } = await createTestStudent({
        email: 'unverified@manit.ac.in',
        email_verified: false,
      });

      const res = await request(app)
        .get('/api/conversations')
        .set('Cookie', [cookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('blocks users with incomplete profile with 403 PROFILE_INCOMPLETE', async () => {
      const { cookie } = await createTestStudent({
        email: 'incomplete@manit.ac.in',
        profile_complete: false,
      });

      const res = await request(app)
        .get('/api/conversations')
        .set('Cookie', [cookie]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PROFILE_INCOMPLETE');
    });
  });

  describe('POST /api/conversations (Create or Get Conversation)', () => {
    it('rejects self-chat attempts with 400 SELF_CHAT_NOT_ALLOWED', async () => {
      const { cookie, userId } = await createTestStudent({ email: 'self@manit.ac.in' });

      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [cookie])
        .send({ candidate_user_id: userId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_CHAT_NOT_ALLOWED');
    });

    it('rejects missing candidate_user_id with 400', async () => {
      const { cookie } = await createTestStudent({ email: 'nocand@manit.ac.in' });

      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [cookie])
        .send({});

      expect(res.status).toBe(400);
    });

    it('blocks conversation creation if users are blocked in either direction', async () => {
      const userA = await createTestStudent({ email: 'blocker@manit.ac.in' });
      const userB = await createTestStudent({ email: 'blocked@manit.ac.in' });

      // User A blocks User B
      await db('blocks').insert({
        blocker_id: userA.userId,
        blocked_id: userB.userId,
      });

      // User B tries to start conversation with User A
      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [userB.cookie])
        .send({ candidate_user_id: userA.userId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('USER_BLOCKED');
    });

    it('creates a conversation maintaining user_a_id < user_b_id order', async () => {
      const user1 = await createTestStudent({ email: 'user1@manit.ac.in', full_name: 'User One' });
      const user2 = await createTestStudent({ email: 'user2@manit.ac.in', full_name: 'User Two' });

      // Even if user with higher ID initiates, user_a_id must be < user_b_id
      const higherUser = user1.userId > user2.userId ? user1 : user2;
      const lowerUser = user1.userId < user2.userId ? user1 : user2;

      const res = await request(app)
        .post('/api/conversations')
        .set('Cookie', [higherUser.cookie])
        .send({ candidate_user_id: lowerUser.userId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.user_a_id).toBe(lowerUser.userId);
      expect(res.body.conversation.user_b_id).toBe(higherUser.userId);
      expect(res.body.conversation.other_user.id).toBe(lowerUser.userId);

      // Verify in DB
      const dbConv = await db('conversations').where({ id: res.body.conversation.id }).first();
      expect(dbConv.user_a_id).toBeLessThan(dbConv.user_b_id);
    });

    it('reuses existing conversation without duplicating DB records', async () => {
      const user1 = await createTestStudent({ email: 'reuse1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'reuse2@manit.ac.in' });

      // First call
      const res1 = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });

      expect(res1.status).toBe(201);
      const convId1 = res1.body.conversation.id;

      // Second call from the other user
      const res2 = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user2.cookie])
        .send({ candidate_user_id: user1.userId });

      expect(res2.status).toBe(201);
      expect(res2.body.conversation.id).toBe(convId1);

      // Verify only 1 row exists
      const count = await db('conversations').count('id as total').first();
      expect(Number(count.total)).toBe(1);
    });
  });

  describe('GET /api/conversations (Inbox List)', () => {
    it('returns conversations with other user profile, unread count, and latest message snippet', async () => {
      const user1 = await createTestStudent({ email: 'inbox1@manit.ac.in', full_name: 'Aarav' });
      const user2 = await createTestStudent({ email: 'inbox2@manit.ac.in', full_name: 'Rohan' });

      // Create conversation
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });

      const convId = convRes.body.conversation.id;

      // User 2 sends a message to User 1
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user2.cookie])
        .send({ content: 'Hey Aarav, are you looking for a room in Bhopal?' });

      // User 1 checks inbox
      const inboxRes = await request(app)
        .get('/api/conversations')
        .set('Cookie', [user1.cookie]);

      expect(inboxRes.status).toBe(200);
      expect(inboxRes.body.conversations).toHaveLength(1);

      const conv = inboxRes.body.conversations[0];
      expect(conv.other_user.full_name).toBe('Rohan');
      expect(conv.unread_count).toBe(1);
      expect(conv.last_message.content).toBe('Hey Aarav, are you looking for a room in Bhopal?');
      expect(conv.last_message.is_read).toBe(false);
    });

    it('STRICT PRIVACY: never exposes other user email, phone, or password hash in conversations', async () => {
      const user1 = await createTestStudent({ email: 'privacy1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'secret_email@manit.ac.in', full_name: 'Secret' });

      await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });

      const res = await request(app)
        .get('/api/conversations')
        .set('Cookie', [user1.cookie]);

      expect(res.status).toBe(200);
      const str = JSON.stringify(res.body);
      expect(str).not.toContain('secret_email@manit.ac.in');
      expect(str).not.toContain('password_hash');
      expect(res.body.conversations[0].other_user.phone).toBeUndefined();
      expect(res.body.conversations[0].other_user.email).toBeUndefined();
    });
  });

  describe('POST and GET /api/conversations/:id/messages', () => {
    it('validates message length between 1 and 1000 characters', async () => {
      const user1 = await createTestStudent({ email: 'len1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'len2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // Empty message
      const emptyRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user1.cookie])
        .send({ content: '   ' });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error.code).toBe('EMPTY_MESSAGE');

      // Oversized message (> 1000 chars)
      const oversizedRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user1.cookie])
        .send({ content: 'a'.repeat(1001) });
      expect(oversizedRes.status).toBe(400);
      expect(oversizedRes.body.error.code).toBe('MESSAGE_TOO_LONG');
    });

    it('blocks non-participants from sending or viewing messages with 403 FORBIDDEN', async () => {
      const user1 = await createTestStudent({ email: 'part1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'part2@manit.ac.in' });
      const outsider = await createTestStudent({ email: 'outsider@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // Outsider tries to view messages
      const getRes = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [outsider.cookie]);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe('FORBIDDEN');

      // Outsider tries to send message
      const postRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [outsider.cookie])
        .send({ content: 'I am not invited!' });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks sending messages if conversation is blocked mid-chat', async () => {
      const user1 = await createTestStudent({ email: 'midblock1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'midblock2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // User 1 blocks User 2
      await db('blocks').insert({
        blocker_id: user1.userId,
        blocked_id: user2.userId,
      });

      // User 2 tries to send message
      const res = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user2.cookie])
        .send({ content: 'Are you there?' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CONVERSATION_BLOCKED');
    });

    it('persists message and automatically marks incoming messages as read upon fetching history', async () => {
      const user1 = await createTestStudent({ email: 'read1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'read2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // User 2 sends message
      const sendRes = await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user2.cookie])
        .send({ content: 'Hello from user 2' });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.message.is_read).toBe(false);

      // User 1 views messages
      const getRes = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [user1.cookie]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.messages).toHaveLength(1);

      // Verify that after User 1 opened chat, the message in DB is marked as read
      const updatedMsg = await db('messages').where({ id: sendRes.body.message.id }).first();
      expect(Boolean(updatedMsg.is_read)).toBe(true);
      expect(updatedMsg.read_at).not.toBeNull();
    });

    it('supports cursor pagination with limit and before', async () => {
      const user1 = await createTestStudent({ email: 'page1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'page2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // Insert 5 messages
      const msgIds = [];
      for (let i = 1; i <= 5; i++) {
        const [id] = await db('messages').insert({
          conversation_id: convId,
          sender_id: user1.userId,
          content: `Message ${i}`,
          is_read: 1,
          created_at: new Date(Date.now() + i * 1000),
        });
        msgIds.push(id);
      }

      // Fetch last 2 messages
      const page1 = await request(app)
        .get(`/api/conversations/${convId}/messages?limit=2`)
        .set('Cookie', [user1.cookie]);

      expect(page1.status).toBe(200);
      expect(page1.body.messages).toHaveLength(2);
      expect(page1.body.messages[0].content).toBe('Message 4');
      expect(page1.body.messages[1].content).toBe('Message 5');
      expect(page1.body.has_more).toBe(true);

      // Fetch messages before Message 4
      const page2 = await request(app)
        .get(`/api/conversations/${convId}/messages?limit=2&before=${page1.body.messages[0].id}`)
        .set('Cookie', [user1.cookie]);

      expect(page2.status).toBe(200);
      expect(page2.body.messages).toHaveLength(2);
      expect(page2.body.messages[0].content).toBe('Message 2');
      expect(page2.body.messages[1].content).toBe('Message 3');
    });
  });

  describe('POST /api/conversations/:id/read (Explicit Read Receipts)', () => {
    it('marks all incoming unread messages as read', async () => {
      const user1 = await createTestStudent({ email: 'mark1@manit.ac.in' });
      const user2 = await createTestStudent({ email: 'mark2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [user1.cookie])
        .send({ candidate_user_id: user2.userId });
      const convId = convRes.body.conversation.id;

      // User 2 sends 2 messages
      await db('messages').insert([
        { conversation_id: convId, sender_id: user2.userId, content: 'msg 1', is_read: 0 },
        { conversation_id: convId, sender_id: user2.userId, content: 'msg 2', is_read: 0 },
      ]);

      const readRes = await request(app)
        .post(`/api/conversations/${convId}/read`)
        .set('Cookie', [user1.cookie]);

      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);
      expect(readRes.body.updated_count).toBe(2);

      const unreadCount = await db('messages')
        .where({ conversation_id: convId, is_read: 0 })
        .count('id as c')
        .first();
      expect(Number(unreadCount.c)).toBe(0);
    });
  });

  describe('Socket.IO socketAuthMiddleware', () => {
    it('authenticates valid token from handshake auth or cookie', () => {
      const token = jwt.sign({ id: 99, email: 'socket@test.edu' }, config.jwt.secret);

      const mockSocketAuth = {
        handshake: {
          auth: { token },
          headers: {},
        },
      };

      let errorResult = null;
      socketAuthMiddleware(mockSocketAuth, (err) => {
        errorResult = err;
      });

      expect(errorResult).toBeUndefined();
      expect(mockSocketAuth.user.id).toBe(99);

      // From cookie
      const mockSocketCookie = {
        handshake: {
          auth: {},
          headers: {
            cookie: `token=${token}; other=value`,
          },
        },
      };

      let errorCookieResult = null;
      socketAuthMiddleware(mockSocketCookie, (err) => {
        errorCookieResult = err;
      });

      expect(errorCookieResult).toBeUndefined();
      expect(mockSocketCookie.user.id).toBe(99);
    });

    it('rejects handshake when token is missing or invalid', () => {
      const mockSocketMissing = {
        handshake: { auth: {}, headers: {} },
      };

      let errorResult = null;
      socketAuthMiddleware(mockSocketMissing, (err) => {
        errorResult = err;
      });

      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult.message).toContain('No token provided');
    });
  });
});
