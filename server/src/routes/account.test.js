import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import bcrypt from 'bcrypt';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';
import registerChatSocket from '../sockets/chat.socket.js';

describe('Account Settings & Deletion API Integration Tests (/api/account)', () => {
  let server;
  let socketServer;
  let serverPort;

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

    server = http.createServer(app);
    socketServer = new SocketIOServer(server, { cors: { origin: '*' } });
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
    await db('reports').del();
    await db('blocks').del();
    await db('messages').del();
    await db('conversations').del();
    await db('match_results').del();
    await db('requirements').del();
    await db('profiles').del();
    await db('users').del();
  });

  const createTestUser = async ({
    email = 'student@manit.ac.in',
    password = 'Password123!',
    fullName = 'Test Student',
  } = {}) => {
    const hash = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({
      email,
      password_hash: hash,
      role: 'student',
      status: 'active',
      email_verified: 1,
      phone: '+919876543210',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('profiles').insert({
      user_id: userId,
      full_name: fullName,
      age: 21,
      gender: 'male',
      college_name: 'MANIT Bhopal',
      city: 'Bhopal',
      profile_completed: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await db('users').where({ id: userId }).first();
  };

  describe('POST /api/account/change-password', () => {
    it('returns 401 UNAUTHORIZED when no auth cookie is provided', async () => {
      const res = await request(app)
        .post('/api/account/change-password')
        .send({
          current_password: 'Password123!',
          new_password: 'NewStrongPassword456!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid inputs with 400 validation error', async () => {
      const user = await createTestUser();

      // Missing current password
      const res1 = await request(app)
        .post('/api/account/change-password')
        .set('Cookie', getAuthCookie(user))
        .send({
          new_password: 'NewPassword123!',
        });
      expect(res1.status).toBe(400);

      // Short new password (< 8 chars)
      const res2 = await request(app)
        .post('/api/account/change-password')
        .set('Cookie', getAuthCookie(user))
        .send({
          current_password: 'Password123!',
          new_password: 'short',
        });
      expect(res2.status).toBe(400);
    });

    it('rejects incorrect current password with 400 INVALID_PASSWORD', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/account/change-password')
        .set('Cookie', getAuthCookie(user))
        .send({
          current_password: 'WrongPassword!',
          new_password: 'NewPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('rejects identical new password with 400 SAME_PASSWORD', async () => {
      const user = await createTestUser({ password: 'Password123!' });

      const res = await request(app)
        .post('/api/account/change-password')
        .set('Cookie', getAuthCookie(user))
        .send({
          current_password: 'Password123!',
          new_password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SAME_PASSWORD');
    });

    it('successfully changes password and allows login with the new password', async () => {
      const user = await createTestUser({ password: 'OldPassword123!' });

      const res = await request(app)
        .post('/api/account/change-password')
        .set('Cookie', getAuthCookie(user))
        .send({
          current_password: 'OldPassword123!',
          new_password: 'BrandNewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old password fails login
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'OldPassword123!',
        });
      expect(oldLogin.status).toBe(401);

      // Verify new password succeeds login
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'BrandNewPassword456!',
        });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.user.email).toBe(user.email);
    });
  });

  describe('DELETE /api/account (Anonymize & Deactivate)', () => {
    it('returns 401 UNAUTHORIZED when no auth cookie is provided', async () => {
      const res = await request(app)
        .delete('/api/account')
        .send({ password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects incorrect password confirmation with 400 INVALID_PASSWORD', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .delete('/api/account')
        .set('Cookie', getAuthCookie(user))
        .send({ password: 'IncorrectPassword!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('anonymizes and deactivates account: removes profile, requirements, matches, redacts messages, disconnects sockets, and stops appearing in others inbox and matches', async () => {
      const user = await createTestUser({ email: 'leaving@manit.ac.in', password: 'Password123!', fullName: 'Leaving Student' });
      const peer = await createTestUser({ email: 'peer@manit.ac.in', password: 'Password123!', fullName: 'Peer Student' });

      // Add requirement for user
      await db('requirements').insert({
        user_id: user.id,
        city: 'Bhopal',
        budget_min: 5000,
        budget_max: 10000,
        is_active: 1,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Add match result between user and peer
      await db('match_results').insert([
        {
          user_id: user.id,
          matched_user_id: peer.id,
          compatibility_score: 85,
          status: 'suggested',
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        },
        {
          user_id: peer.id,
          matched_user_id: user.id,
          compatibility_score: 85,
          status: 'suggested',
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        },
      ]);

      // Create conversation and messages between user and peer
      const [convId] = await db('conversations').insert({
        user_a_id: Math.min(user.id, peer.id),
        user_b_id: Math.max(user.id, peer.id),
        last_message_at: db.fn.now(),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await db('messages').insert([
        {
          conversation_id: convId,
          sender_id: user.id,
          content: 'Secret personal message from user',
          is_read: 1,
          created_at: db.fn.now(),
        },
        {
          conversation_id: convId,
          sender_id: peer.id,
          content: 'Hello there!',
          is_read: 1,
          created_at: db.fn.now(),
        },
      ]);

      // Connect Socket.IO client for the leaving user
      const userToken = getAuthToken(user);
      const userSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      await new Promise((resolve) => userSocket.on('connect', resolve));
      expect(userSocket.connected).toBe(true);

      const socketDisconnectedPromise = new Promise((resolve) => {
        userSocket.on('disconnect', (reason) => resolve(reason));
      });

      // Execute account deletion
      const userCookie = getAuthCookie(user);
      const res = await request(app)
        .delete('/api/account')
        .set('Cookie', userCookie)
        .send({ password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Socket was forcibly disconnected
      const disconnectReason = await socketDisconnectedPromise;
      expect(disconnectReason).toBeDefined();

      // 1. Verify user record in DB: status='deactivated', email anonymized, password_hash changed
      const dbUser = await db('users').where({ id: user.id }).first();
      expect(dbUser.status).toBe('deactivated');
      expect(dbUser.email).toContain('deleted_');
      expect(dbUser.password_hash).toBe('DELETED');
      expect(dbUser.phone).toBeNull();

      // 2. Verify profile is removed
      const dbProfile = await db('profiles').where({ user_id: user.id }).first();
      expect(dbProfile).toBeUndefined();

      // 3. Verify requirements are removed
      const dbReq = await db('requirements').where({ user_id: user.id }).first();
      expect(dbReq).toBeUndefined();

      // 4. Verify match results are removed
      const dbMatches = await db('match_results')
        .where({ user_id: user.id })
        .orWhere({ matched_user_id: user.id });
      expect(dbMatches.length).toBe(0);

      // 5. Verify messages content sent by user is replaced with [deleted]
      const userMsg = await db('messages').where({ sender_id: user.id }).first();
      expect(userMsg.content).toBe('[deleted]');

      // Peer's own message remains intact
      const peerMsg = await db('messages').where({ sender_id: peer.id }).first();
      expect(peerMsg.content).toBe('Hello there!');

      // 6. Verify peer's inbox does not show conversation with deactivated user
      const peerCookie = getAuthCookie(peer);
      const inboxRes = await request(app)
        .get('/api/conversations')
        .set('Cookie', peerCookie);
      expect(inboxRes.status).toBe(200);
      const foundConv = inboxRes.body.conversations.find((c) => c.id === convId);
      expect(foundConv).toBeUndefined();

      // 7. Verify deactivated user cannot make authenticated calls (403 USER_DEACTIVATED)
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', userCookie);
      expect(meRes.status).toBe(403);
      expect(meRes.body.error.code).toBe('USER_DEACTIVATED');

      // 8. Verify deactivated user cannot log in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'leaving@manit.ac.in',
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(401); // Email no longer exists (blanked)
    });
  });
});
