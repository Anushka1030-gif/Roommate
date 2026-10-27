import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';
import { socketAuthMiddleware } from '../sockets/chat.socket.js';
import matchingService from '../services/matching.service.js';

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

  describe('Step 12: Mutual-Consent Contact Sharing & Roommate Confirmation', () => {
    it('sets caller share flag and keeps contact hidden until both consent', async () => {
      const student1 = await createTestStudent({
        email: 'alice@manit.ac.in',
        full_name: 'Alice Sharma',
      });
      // Add phone for student 2
      const student2 = await createTestStudent({
        email: 'bob@manit.ac.in',
        full_name: 'Bob Verma',
      });
      await db('users').where({ id: student2.userId }).update({ phone: '+919876543210' });

      // Create conversation
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // 1. Initially neither has shared contact: fetching contact gives 403 CONTACT_NOT_SHARED
      const contactInitial = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(contactInitial.status).toBe(403);
      expect(contactInitial.body.error.code).toBe('CONTACT_NOT_SHARED');

      // 2. Student 1 turns on sharing
      const share1Res = await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student1.cookie])
        .send({ share: true });
      expect(share1Res.status).toBe(200);
      expect(share1Res.body.my_share).toBe(true);
      expect(share1Res.body.other_shared).toBe(false);
      expect(share1Res.body.both_shared).toBe(false);

      // Still hidden from student 1
      const contactStillHidden1 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(contactStillHidden1.status).toBe(403);
      expect(contactStillHidden1.body.error.code).toBe('CONTACT_NOT_SHARED');

      // Still hidden from student 2
      const contactStillHidden2 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student2.cookie]);
      expect(contactStillHidden2.status).toBe(403);
      expect(contactStillHidden2.body.error.code).toBe('CONTACT_NOT_SHARED');

      // 3. Student 2 also turns on sharing -> BOTH have consented
      const share2Res = await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student2.cookie])
        .send({ share: true });
      expect(share2Res.status).toBe(200);
      expect(share2Res.body.my_share).toBe(true);
      expect(share2Res.body.other_shared).toBe(true);
      expect(share2Res.body.both_shared).toBe(true);

      // Now Student 1 can view Student 2's contact (email + phone)
      const contactRevealedTo1 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(contactRevealedTo1.status).toBe(200);
      expect(contactRevealedTo1.body.contact.email).toBe('bob@manit.ac.in');
      expect(contactRevealedTo1.body.contact.phone).toBe('+919876543210');

      // And Student 2 can view Student 1's contact (email, null phone)
      const contactRevealedTo2 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student2.cookie]);
      expect(contactRevealedTo2.status).toBe(200);
      expect(contactRevealedTo2.body.contact.email).toBe('alice@manit.ac.in');
      expect(contactRevealedTo2.body.contact.phone).toBeNull();
    });

    it('turning sharing off hides contact again immediately', async () => {
      const student1 = await createTestStudent({ email: 's1@manit.ac.in' });
      const student2 = await createTestStudent({ email: 's2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // Both share
      await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student1.cookie])
        .send({ share: true });
      await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student2.cookie])
        .send({ share: true });

      // Revealed
      const revealed = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(revealed.status).toBe(200);

      // Student 1 turns off sharing
      const unshareRes = await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student1.cookie])
        .send({ share: false });
      expect(unshareRes.status).toBe(200);
      expect(unshareRes.body.my_share).toBe(false);
      expect(unshareRes.body.both_shared).toBe(false);

      // Now contact is hidden again for both
      const hidden1 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(hidden1.status).toBe(403);
      expect(hidden1.body.error.code).toBe('CONTACT_NOT_SHARED');

      const hidden2 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student2.cookie]);
      expect(hidden2.status).toBe(403);
      expect(hidden2.body.error.code).toBe('CONTACT_NOT_SHARED');
    });

    it('blocked users cannot fetch contact even if both had consented', async () => {
      const student1 = await createTestStudent({ email: 'block1@manit.ac.in' });
      const student2 = await createTestStudent({ email: 'block2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // Both share
      await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student1.cookie])
        .send({ share: true });
      await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [student2.cookie])
        .send({ share: true });

      // Student 1 blocks Student 2
      await db('blocks').insert({
        blocker_id: student1.userId,
        blocked_id: student2.userId,
        created_at: db.fn.now(),
      });

      // Fetching contact fails with 403 CONTACT_NOT_SHARED
      const res1 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student1.cookie]);
      expect(res1.status).toBe(403);
      expect(res1.body.error.code).toBe('CONTACT_NOT_SHARED');

      const res2 = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [student2.cookie]);
      expect(res2.status).toBe(403);
      expect(res2.body.error.code).toBe('CONTACT_NOT_SHARED');
    });

    it('a non-participant gets 403 FORBIDDEN on share, get contact, and confirm roommates', async () => {
      const student1 = await createTestStudent({ email: 'p1@manit.ac.in' });
      const student2 = await createTestStudent({ email: 'p2@manit.ac.in' });
      const outsider = await createTestStudent({ email: 'outsider@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // Outsider attempts to get conversation
      const getRes = await request(app)
        .get(`/api/conversations/${convId}`)
        .set('Cookie', [outsider.cookie]);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe('FORBIDDEN');

      // Outsider attempts to share contact
      const shareRes = await request(app)
        .post(`/api/conversations/${convId}/share-contact`)
        .set('Cookie', [outsider.cookie])
        .send({ share: true });
      expect(shareRes.status).toBe(403);
      expect(shareRes.body.error.code).toBe('FORBIDDEN');

      // Outsider attempts to fetch contact
      const contactRes = await request(app)
        .get(`/api/conversations/${convId}/contact`)
        .set('Cookie', [outsider.cookie]);
      expect(contactRes.status).toBe(403);
      expect(contactRes.body.error.code).toBe('FORBIDDEN');

      // Outsider attempts to confirm roommates
      const confirmRes = await request(app)
        .post(`/api/conversations/${convId}/confirm-roommates`)
        .set('Cookie', [outsider.cookie]);
      expect(confirmRes.status).toBe(403);
      expect(confirmRes.body.error.code).toBe('FORBIDDEN');
    });

    it('roommate confirmation requires both users and updates conversation states', async () => {
      const student1 = await createTestStudent({ email: 'roomie1@manit.ac.in' });
      const student2 = await createTestStudent({ email: 'roomie2@manit.ac.in' });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // 1. Initial state: neither confirmed
      const initialConv = await request(app)
        .get(`/api/conversations/${convId}`)
        .set('Cookie', [student1.cookie]);
      expect(initialConv.body.conversation.me_confirmed).toBe(false);
      expect(initialConv.body.conversation.other_confirmed).toBe(false);
      expect(initialConv.body.conversation.both_confirmed).toBe(false);
      expect(initialConv.body.conversation.roommate_status).toBe('none');

      // 2. Student 1 confirms
      const confirm1 = await request(app)
        .post(`/api/conversations/${convId}/confirm-roommates`)
        .set('Cookie', [student1.cookie]);
      expect(confirm1.status).toBe(200);
      expect(confirm1.body.me_confirmed).toBe(true);
      expect(confirm1.body.other_confirmed).toBe(false);
      expect(confirm1.body.both_confirmed).toBe(false);
      expect(confirm1.body.roommate_status).toBe('pending');

      // Check Student 2 perspective on conversation
      const convFor2 = await request(app)
        .get(`/api/conversations/${convId}`)
        .set('Cookie', [student2.cookie]);
      expect(convFor2.body.conversation.me_confirmed).toBe(false);
      expect(convFor2.body.conversation.other_confirmed).toBe(true);
      expect(convFor2.body.conversation.both_confirmed).toBe(false);

      // 3. Student 2 confirms -> BOTH confirmed
      const confirm2 = await request(app)
        .post(`/api/conversations/${convId}/confirm-roommates`)
        .set('Cookie', [student2.cookie]);
      expect(confirm2.status).toBe(200);
      expect(confirm2.body.me_confirmed).toBe(true);
      expect(confirm2.body.other_confirmed).toBe(true);
      expect(confirm2.body.both_confirmed).toBe(true);
      expect(confirm2.body.roommate_status).toBe('confirmed');

      // Verify conversation state for Student 1
      const convFinal1 = await request(app)
        .get(`/api/conversations/${convId}`)
        .set('Cookie', [student1.cookie]);
      expect(convFinal1.body.conversation.me_confirmed).toBe(true);
      expect(convFinal1.body.conversation.other_confirmed).toBe(true);
      expect(convFinal1.body.conversation.both_confirmed).toBe(true);
      expect(convFinal1.body.conversation.roommate_status).toBe('confirmed');
    });

    it('STRICT PRIVACY: proves NO other endpoint leaks email or phone', async () => {
      const student1 = await createTestStudent({
        email: 'secret_seeker@manit.ac.in',
        full_name: 'Seeker Student',
      });
      const student2 = await createTestStudent({
        email: 'secret_candidate@manit.ac.in',
        full_name: 'Secret Candidate',
      });
      await db('users').where({ id: student2.userId }).update({ phone: '+919988776655' });

      // Add active requirements
      await db('requirements').insert({
        user_id: student1.userId,
        city: 'Bhopal',
        budget_min: 5000,
        budget_max: 10000,
        gender_preference: 'any',
        smoking_ok: 1,
        drinking_ok: 1,
        guests_ok: 'sometimes',
        is_active: 1,
      });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // Send a message
      await request(app)
        .post(`/api/conversations/${convId}/messages`)
        .set('Cookie', [student1.cookie])
        .send({ content: 'Hi secret candidate' });

      // 1. GET /api/conversations (Inbox)
      const inboxRes = await request(app)
        .get('/api/conversations')
        .set('Cookie', [student1.cookie]);
      const inboxJson = JSON.stringify(inboxRes.body);
      expect(inboxJson).not.toContain('secret_candidate@manit.ac.in');
      expect(inboxJson).not.toContain('+919988776655');

      // 2. GET /api/conversations/:id
      const convDetailRes = await request(app)
        .get(`/api/conversations/${convId}`)
        .set('Cookie', [student1.cookie]);
      const detailJson = JSON.stringify(convDetailRes.body);
      expect(detailJson).not.toContain('secret_candidate@manit.ac.in');
      expect(detailJson).not.toContain('+919988776655');

      // 3. GET /api/conversations/:id/messages
      const msgRes = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Cookie', [student1.cookie]);
      const msgJson = JSON.stringify(msgRes.body);
      expect(msgJson).not.toContain('secret_candidate@manit.ac.in');
      expect(msgJson).not.toContain('+919988776655');
    });

    it('after both confirm, the matching engine excludes these two users from each other matches', async () => {
      const student1 = await createTestStudent({ email: 'match_ex1@manit.ac.in', full_name: 'Student One' });
      const student2 = await createTestStudent({ email: 'match_ex2@manit.ac.in', full_name: 'Student Two' });

      // Both have active requirements in Bhopal
      const [req1Id] = await db('requirements').insert({
        user_id: student1.userId,
        city: 'Bhopal',
        budget_min: 5000,
        budget_max: 10000,
        gender_preference: 'any',
        smoking_ok: 1,
        drinking_ok: 1,
        guests_ok: 'sometimes',
        is_active: 1,
      });

      await db('requirements').insert({
        user_id: student2.userId,
        city: 'Bhopal',
        budget_min: 5000,
        budget_max: 10000,
        gender_preference: 'any',
        smoking_ok: 1,
        drinking_ok: 1,
        guests_ok: 'sometimes',
        is_active: 1,
      });

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Cookie', [student1.cookie])
        .send({ candidate_user_id: student2.userId });
      const convId = convRes.body.conversation.id;

      // Seed match result for student 1 with student 2
      await db('match_results').insert({
        user_id: student1.userId,
        matched_user_id: student2.userId,
        compatibility_score: 95,
        ai_summary: 'Great match',
        source: 'fallback',
        status: 'suggested',
      });

      // Verify candidate is eligible before confirmation
      const req1 = await db('requirements').where({ id: req1Id }).first();
      const prof1 = await db('profiles').where({ user_id: student1.userId }).first();
      const initialCandidates = await matchingService.findEligibleCandidates(student1.userId, req1, prof1);
      expect(initialCandidates.some((c) => c.candidate_user_id === student2.userId)).toBe(true);

      // Both confirm roommates
      await request(app)
        .post(`/api/conversations/${convId}/confirm-roommates`)
        .set('Cookie', [student1.cookie]);
      await request(app)
        .post(`/api/conversations/${convId}/confirm-roommates`)
        .set('Cookie', [student2.cookie]);

      // Verify candidate is excluded from findEligibleCandidates
      const afterCandidates = await matchingService.findEligibleCandidates(student1.userId, req1, prof1);
      expect(afterCandidates.some((c) => c.candidate_user_id === student2.userId)).toBe(false);

      // Verify cached matches excludes them
      const cachedMatches = await matchingService.getCachedMatches(student1.userId);
      expect(cachedMatches.matches.some((m) => m.candidate_id === student2.userId)).toBe(false);
    });
  });
});
