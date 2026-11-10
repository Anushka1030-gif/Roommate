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

describe('Admin Backend API Integration Tests (Step 14)', () => {
  let server;
  let socketServer;
  let serverPort;
  let hashedStudentPassword;

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
    hashedStudentPassword = await bcrypt.hash('Password123!', 10);

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

  const createAdminUser = async () => {
    const [userId] = await db('users').insert({
      email: 'admin@roomiematch.edu',
      password_hash: 'hashed_admin_password',
      role: 'admin',
      status: 'active',
      email_verified: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('profiles').insert({
      user_id: userId,
      full_name: 'RoomieMatch Administrator',
      profile_completed: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await db('users').where({ id: userId }).first();
  };

  const createStudentUser = async ({ email, fullName, status = 'active' }) => {
    const [userId] = await db('users').insert({
      email,
      password_hash: hashedStudentPassword,
      role: 'student',
      status,
      email_verified: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('profiles').insert({
      user_id: userId,
      full_name: fullName,
      age: 20,
      gender: 'female',
      college_name: 'MANIT Bhopal',
      city: 'Bhopal',
      profile_completed: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await db('users').where({ id: userId }).first();
  };

  describe('Authorization Guards on Admin Routes', () => {
    it('returns 401 UNAUTHORIZED when unauthenticated requests try to access admin routes', async () => {
      const getReportsRes = await request(app).get('/api/admin/reports');
      expect(getReportsRes.status).toBe(401);

      const patchReportRes = await request(app).patch('/api/admin/reports/1').send({ action: 'dismiss' });
      expect(patchReportRes.status).toBe(401);

      const getStatsRes = await request(app).get('/api/admin/stats');
      expect(getStatsRes.status).toBe(401);
    });

    it('returns 403 FORBIDDEN when non-admin student users try to access any admin route', async () => {
      const student = await createStudentUser({ email: 'student1@manit.ac.in', fullName: 'Student One' });
      const cookie = getAuthCookie(student);

      const getReportsRes = await request(app)
        .get('/api/admin/reports')
        .set('Cookie', cookie);
      expect(getReportsRes.status).toBe(403);
      expect(getReportsRes.body.error.code).toBe('FORBIDDEN');

      const patchReportRes = await request(app)
        .patch('/api/admin/reports/1')
        .set('Cookie', cookie)
        .send({ action: 'dismiss' });
      expect(patchReportRes.status).toBe(403);
      expect(patchReportRes.body.error.code).toBe('FORBIDDEN');

      const getStatsRes = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', cookie);
      expect(getStatsRes.status).toBe(403);
      expect(getStatsRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/admin/reports', () => {
    it('returns reports with reporter and reported user names, emails, total reports count, and status filter', async () => {
      const admin = await createAdminUser();
      const reporter = await createStudentUser({ email: 'reporter@manit.ac.in', fullName: 'Alice Reporter' });
      const spammer = await createStudentUser({ email: 'spammer@manit.ac.in', fullName: 'Bob Spammer' });
      const otherUser = await createStudentUser({ email: 'other@manit.ac.in', fullName: 'Charlie Other' });

      // Create 2 reports for Bob Spammer and 1 report for Charlie Other
      const [report1Id] = await db('reports').insert({
        reporter_id: reporter.id,
        reported_id: spammer.id,
        reason: 'spam',
        details: 'Advertising commercial properties.',
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await db('reports').insert({
        reporter_id: otherUser.id,
        reported_id: spammer.id,
        reason: 'harassment',
        details: 'Sent harassing messages in chat.',
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await db('reports').insert({
        reporter_id: reporter.id,
        reported_id: otherUser.id,
        reason: 'fake_profile',
        details: 'Fake graduation year and college info.',
        status: 'dismissed',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // 1. GET with ?status=open returns pending/reviewed reports
      const openRes = await request(app)
        .get('/api/admin/reports?status=open')
        .set('Cookie', getAuthCookie(admin));

      expect(openRes.status).toBe(200);
      expect(openRes.body.success).toBe(true);
      expect(openRes.body.reports).toHaveLength(2);

      const bobReport = openRes.body.reports.find((r) => r.id === report1Id);
      expect(bobReport).toBeDefined();
      expect(bobReport.reason).toBe('spam');
      expect(bobReport.details).toBe('Advertising commercial properties.');
      expect(bobReport.status).toBe('pending');

      // Check reporter details (admin may see emails)
      expect(bobReport.reporter.id).toBe(reporter.id);
      expect(bobReport.reporter.full_name).toBe('Alice Reporter');
      expect(bobReport.reporter.email).toBe('reporter@manit.ac.in');

      // Check reported user details (admin may see emails and total reports count)
      expect(bobReport.reported_user.id).toBe(spammer.id);
      expect(bobReport.reported_user.full_name).toBe('Bob Spammer');
      expect(bobReport.reported_user.email).toBe('spammer@manit.ac.in');
      expect(bobReport.reported_user.total_reports_count).toBe(2);

      // 2. GET with ?status=dismissed returns the 1 dismissed report
      const dismissedRes = await request(app)
        .get('/api/admin/reports?status=dismissed')
        .set('Cookie', getAuthCookie(admin));

      expect(dismissedRes.status).toBe(200);
      expect(dismissedRes.body.reports).toHaveLength(1);
      expect(dismissedRes.body.reports[0].reason).toBe('fake_profile');
    });
  });

  describe('PATCH /api/admin/reports/:id (Moderation Actions)', () => {
    it('action="dismiss" updates report status to dismissed and stores admin note', async () => {
      const admin = await createAdminUser();
      const reporter = await createStudentUser({ email: 'reporter@manit.ac.in', fullName: 'Alice Reporter' });
      const target = await createStudentUser({ email: 'target@manit.ac.in', fullName: 'Target Student' });

      const [reportId] = await db('reports').insert({
        reporter_id: reporter.id,
        reported_id: target.id,
        reason: 'other',
        details: 'Minor misunderstanding',
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      const res = await request(app)
        .patch(`/api/admin/reports/${reportId}`)
        .set('Cookie', getAuthCookie(admin))
        .send({
          action: 'dismiss',
          note: 'Investigated and found no violation of guidelines.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('dismissed');

      // Verify in DB
      const updatedReport = await db('reports').where({ id: reportId }).first();
      expect(updatedReport.status).toBe('dismissed');
      expect(updatedReport.admin_note).toBe('Investigated and found no violation of guidelines.');
      expect(updatedReport.reviewed_by).toBe(admin.id);
      expect(updatedReport.reviewed_at).toBeDefined();

      // Target user status should remain active
      const userRow = await db('users').where({ id: target.id }).first();
      expect(userRow.status).toBe('active');
    });

    it('action="warn" updates report status to reviewed and stores admin note', async () => {
      const admin = await createAdminUser();
      const reporter = await createStudentUser({ email: 'reporter@manit.ac.in', fullName: 'Alice Reporter' });
      const target = await createStudentUser({ email: 'target@manit.ac.in', fullName: 'Target Student' });

      const [reportId] = await db('reports').insert({
        reporter_id: reporter.id,
        reported_id: target.id,
        reason: 'harassment',
        details: 'Used rude language',
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      const res = await request(app)
        .patch(`/api/admin/reports/${reportId}`)
        .set('Cookie', getAuthCookie(admin))
        .send({
          action: 'warn',
          note: 'First written warning regarding polite communication.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('reviewed');

      const updatedReport = await db('reports').where({ id: reportId }).first();
      expect(updatedReport.status).toBe('reviewed');
      expect(updatedReport.admin_note).toBe('First written warning regarding polite communication.');
    });

    it('action="suspend" sets user status to suspended, terminates active sessions and blocks immediate login and API access', async () => {
      const admin = await createAdminUser();
      const reporter = await createStudentUser({ email: 'reporter@manit.ac.in', fullName: 'Alice Reporter' });
      const offender = await createStudentUser({ email: 'offender@manit.ac.in', fullName: 'Bad Actor' });

      const [reportId] = await db('reports').insert({
        reporter_id: reporter.id,
        reported_id: offender.id,
        reason: 'harassment',
        details: 'Severe harassment and threats.',
        status: 'pending',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Prepare offender token
      const offenderCookie = getAuthCookie(offender);
      const offenderToken = getAuthToken(offender);

      // Connect Socket.IO client as offender
      const offenderSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: offenderToken },
        transports: ['websocket'],
      });

      await new Promise((resolve) => offenderSocket.on('connect', resolve));
      expect(offenderSocket.connected).toBe(true);

      // Listen for socket disconnect
      const socketDisconnectedPromise = new Promise((resolve) => {
        offenderSocket.on('disconnect', (reason) => resolve(reason));
      });

      // Admin executes "suspend"
      const res = await request(app)
        .patch(`/api/admin/reports/${reportId}`)
        .set('Cookie', getAuthCookie(admin))
        .send({
          action: 'suspend',
          note: 'Severe community guidelines violation. Account terminated.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('resolved');
      expect(res.body.suspended_user_id).toBe(offender.id);

      // 1. Verify user status in DB is now 'suspended'
      const updatedUser = await db('users').where({ id: offender.id }).first();
      expect(updatedUser.status).toBe('suspended');

      // 2. Verify socket was immediately disconnected
      const disconnectReason = await socketDisconnectedPromise;
      expect(disconnectReason).toBeDefined();

      // 3. Verify immediate API access with offender's existing token returns 403 USER_SUSPENDED
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', offenderCookie);
      expect(meRes.status).toBe(403);
      expect(meRes.body.error.code).toBe('USER_SUSPENDED');

      // 4. Verify new login attempt returns 403 USER_SUSPENDED
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'offender@manit.ac.in',
          password: 'Password123!',
        });
      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.code).toBe('USER_SUSPENDED');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns correct counts for total users, verified, complete profiles, active requirements, conversations, contact shares, and confirmed roommate pairs', async () => {
      const admin = await createAdminUser();

      // Create 3 students:
      // Student 1: verified, complete profile, active requirement
      const [u1] = await db('users').insert({
        email: 'u1@manit.ac.in',
        password_hash: 'hash',
        role: 'student',
        status: 'active',
        email_verified: 1,
      });
      await db('profiles').insert({
        user_id: u1,
        full_name: 'User 1',
        profile_completed: 1,
      });
      await db('requirements').insert({
        user_id: u1,
        city: 'Bhopal',
        budget_min: 6000,
        budget_max: 9000,
        is_active: 1,
      });

      // Student 2: verified, complete profile, active requirement
      const [u2] = await db('users').insert({
        email: 'u2@manit.ac.in',
        password_hash: 'hash',
        role: 'student',
        status: 'active',
        email_verified: 1,
      });
      await db('profiles').insert({
        user_id: u2,
        full_name: 'User 2',
        profile_completed: 1,
      });
      await db('requirements').insert({
        user_id: u2,
        city: 'Bhopal',
        budget_min: 6000,
        budget_max: 9000,
        is_active: 1,
      });

      // Student 3: unverified, incomplete profile, inactive requirement
      const [u3] = await db('users').insert({
        email: 'u3@manit.ac.in',
        password_hash: 'hash',
        role: 'student',
        status: 'active',
        email_verified: 0,
      });
      await db('profiles').insert({
        user_id: u3,
        full_name: 'User 3',
        profile_completed: 0,
      });
      await db('requirements').insert({
        user_id: u3,
        city: 'Bhopal',
        budget_min: 5000,
        budget_max: 8000,
        is_active: 0,
      });

      // Conversations:
      // Conv 1 between u1 & u2: both share contact (1) AND confirmed roommates (1)
      await db('conversations').insert({
        user_a_id: Math.min(u1, u2),
        user_b_id: Math.max(u1, u2),
        a_shares_contact: 1,
        b_shares_contact: 1,
        a_confirmed_roommates: 1,
        b_confirmed_roommates: 1,
        roommate_status: 'confirmed',
      });

      // Conv 2 between u1 & u3: no contact share, not confirmed
      await db('conversations').insert({
        user_a_id: Math.min(u1, u3),
        user_b_id: Math.max(u1, u3),
        a_shares_contact: 1,
        b_shares_contact: 0,
        roommate_status: 'none',
      });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', getAuthCookie(admin));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.stats;
      // Total users: 1 admin + 3 students = 4
      expect(stats.total_users).toBe(4);
      // Verified users: 1 admin + 2 students = 3
      expect(stats.verified_users).toBe(3);
      // Completed profiles: 1 admin + 2 students = 3
      expect(stats.completed_profiles).toBe(3);
      // Active requirements: 2 students = 2
      expect(stats.active_requirements).toBe(2);
      // Conversations: 2
      expect(stats.conversations).toBe(2);
      // Contact share agreements (both shared): 1
      expect(stats.contact_share_agreements).toBe(1);
      // Confirmed roommate pairs (North-Star Metric): 1
      expect(stats.confirmed_roommate_pairs).toBe(1);
    });
  });
});

