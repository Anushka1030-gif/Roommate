import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import db from '../db/index.js';
import mailService from '../services/mail.service.js';
import { requireVerified } from '../middleware/auth.middleware.js';

describe('Auth Backend API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure test database has latest migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    // Clean tables before each test
    await db('rate_limit_events').del();
    await db('email_otps').del();
    await db('profiles').del();
    await db('users').del();
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers with a valid college email and sends OTP', async () => {
      const response = await request(app).post('/api/auth/register').send({
        full_name: 'Aarav Sharma',
        email: 'aarav@manit.ac.in',
        password: 'SecurePassword123!',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('email', 'aarav@manit.ac.in');

      // Verify user in DB
      const user = await db('users').where({ email: 'aarav@manit.ac.in' }).first();
      expect(user).toBeDefined();
      expect(user.role).toBe('student');
      expect(user.email_verified).toBeFalsy();
      expect(user.status).toBe('active');
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('SecurePassword123!');

      // Verify profile in DB
      const profile = await db('profiles').where({ user_id: user.id }).first();
      expect(profile).toBeDefined();
      expect(profile.full_name).toBe('Aarav Sharma');

      // Verify OTP in DB and mail service
      const otpRecord = await db('email_otps').where({ email: 'aarav@manit.ac.in' }).first();
      expect(otpRecord).toBeDefined();
      expect(otpRecord.attempts).toBe(0);
      expect(otpRecord.consumed_at).toBeNull();

      const lastMail = mailService.getLastSentMail();
      expect(lastMail).toBeDefined();
      expect(lastMail.to).toBe('aarav@manit.ac.in');
      expect(lastMail.otp).toMatch(/^\d{6}$/);
    });

    it('rejects emails from blocked public domains with EMAIL_DOMAIN_NOT_ALLOWED', async () => {
      const blockedEmails = [
        'student@gmail.com',
        'student@yahoo.com',
        'student@outlook.com',
        'student@hotmail.com',
        'student@icloud.com',
      ];

      for (const email of blockedEmails) {
        const response = await request(app).post('/api/auth/register').send({
          full_name: 'Test Student',
          email,
          password: 'SecurePassword123!',
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
      }

      // Verify no user was created
      const count = await db('users').count('id as count').first();
      expect(count.count).toBe(0);
    });

    it('rejects duplicate email registrations with EMAIL_ALREADY_EXISTS', async () => {
      // First registration
      const firstRes = await request(app).post('/api/auth/register').send({
        full_name: 'First User',
        email: 'duplicate@manit.ac.in',
        password: 'SecurePassword123!',
      });
      expect(firstRes.status).toBe(201);

      // Duplicate registration attempt
      const secondRes = await request(app).post('/api/auth/register').send({
        full_name: 'Second User',
        email: 'duplicate@manit.ac.in',
        password: 'AnotherPassword123!',
      });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toHaveProperty('error');
      expect(secondRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('validates password minimum length (8 chars)', async () => {
      const response = await request(app).post('/api/auth/register').send({
        full_name: 'Short Password',
        email: 'short@manit.ac.in',
        password: '12345',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('successfully verifies correct OTP, marks OTP used, and sets email_verified=1', async () => {
      // Register user
      await request(app).post('/api/auth/register').send({
        full_name: 'Priya Patel',
        email: 'priya@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const sentOtp = mailService.getLastSentMail().otp;
      expect(sentOtp).toBeDefined();

      // Verify OTP
      const verifyRes = await request(app).post('/api/auth/verify-otp').send({
        email: 'priya@manit.ac.in',
        otp: sentOtp,
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body).toHaveProperty('message');
      expect(verifyRes.body.user).toHaveProperty('email_verified', true);
      expect(verifyRes.body.user).toHaveProperty('full_name', 'Priya Patel');

      // Check DB state
      const user = await db('users').where({ email: 'priya@manit.ac.in' }).first();
      expect(Boolean(user.email_verified)).toBe(true);

      const otpRecord = await db('email_otps').where({ email: 'priya@manit.ac.in' }).first();
      expect(otpRecord.consumed_at).not.toBeNull();
    });

    it('rejects wrong OTP with INVALID_OTP and tracks attempt count', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Wrong OTP User',
        email: 'wrong@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const response = await request(app).post('/api/auth/verify-otp').send({
        email: 'wrong@manit.ac.in',
        otp: '999999',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_OTP');

      // Verify attempt count incremented in DB
      const otpRecord = await db('email_otps').where({ email: 'wrong@manit.ac.in' }).first();
      expect(otpRecord.attempts).toBe(1);
    });

    it('enforces maximum 5 OTP attempts and rejects subsequent attempts with OTP_MAX_ATTEMPTS_EXCEEDED', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Max Attempts User',
        email: 'maxattempts@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const validOtp = mailService.getLastSentMail().otp;

      // Fail 4 times
      for (let i = 1; i <= 4; i++) {
        const res = await request(app).post('/api/auth/verify-otp').send({
          email: 'maxattempts@manit.ac.in',
          otp: '000000',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_OTP');
      }

      // 5th failed attempt should trigger limit exceeded
      const fifthRes = await request(app).post('/api/auth/verify-otp').send({
        email: 'maxattempts@manit.ac.in',
        otp: '000000',
      });
      expect(fifthRes.status).toBe(400);
      expect(fifthRes.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');

      // Even correct OTP should now be rejected
      const sixthRes = await request(app).post('/api/auth/verify-otp').send({
        email: 'maxattempts@manit.ac.in',
        otp: validOtp,
      });
      expect(sixthRes.status).toBe(400);
      expect(sixthRes.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');
    });

    it('rejects expired OTP with OTP_EXPIRED', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Expired OTP User',
        email: 'expired@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const validOtp = mailService.getLastSentMail().otp;

      // Simulate expiration by updating DB record
      await db('email_otps')
        .where({ email: 'expired@manit.ac.in' })
        .update({
          expires_at: new Date(Date.now() - 5000), // 5 seconds ago
        });

      const response = await request(app).post('/api/auth/verify-otp').send({
        email: 'expired@manit.ac.in',
        otp: validOtp,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('OTP_EXPIRED');
    });
  });

  describe('POST /api/auth/resend-otp', () => {
    it('enforces 60-second cooldown between resend requests with OTP_COOLDOWN_ACTIVE', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Cooldown User',
        email: 'cooldown@manit.ac.in',
        password: 'SecurePassword123!',
      });

      // Immediate resend should fail due to 60s cooldown
      const immediateRes = await request(app).post('/api/auth/resend-otp').send({
        email: 'cooldown@manit.ac.in',
      });

      expect(immediateRes.status).toBe(429);
      expect(immediateRes.body).toHaveProperty('error');
      expect(immediateRes.body.error.code).toBe('OTP_COOLDOWN_ACTIVE');

      // Backdate the created_at by 65 seconds to simulate passage of time
      await db('email_otps')
        .where({ email: 'cooldown@manit.ac.in' })
        .update({
          created_at: new Date(Date.now() - 65 * 1000),
        });

      // Resend should now succeed
      const allowedRes = await request(app).post('/api/auth/resend-otp').send({
        email: 'cooldown@manit.ac.in',
      });

      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('allows login for unverified user with email_verified=false and issues JWT cookie', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Unverified Student',
        email: 'unverified@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'unverified@manit.ac.in',
        password: 'SecurePassword123!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user).toHaveProperty('email_verified', false);
      expect(loginRes.body.user).toHaveProperty('full_name', 'Unverified Student');
      expect(loginRes.body.user).toHaveProperty('role', 'student');
      expect(loginRes.body.user).not.toHaveProperty('password_hash');

      // Check httpOnly cookie
      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('token='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c) => c.includes('SameSite=Lax'))).toBe(true);
    });

    it('allows login for verified user with email_verified=true', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Verified Student',
        email: 'verified@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const otp = mailService.getLastSentMail().otp;
      await request(app).post('/api/auth/verify-otp').send({
        email: 'verified@manit.ac.in',
        otp,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'verified@manit.ac.in',
        password: 'SecurePassword123!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user).toHaveProperty('email_verified', true);
    });

    it('rejects suspended users with 403 USER_SUSPENDED', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Suspended Student',
        email: 'suspended@manit.ac.in',
        password: 'SecurePassword123!',
      });

      // Mark user suspended in database
      await db('users')
        .where({ email: 'suspended@manit.ac.in' })
        .update({ status: 'suspended' });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'suspended@manit.ac.in',
        password: 'SecurePassword123!',
      });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body).toHaveProperty('error');
      expect(loginRes.body.error.code).toBe('USER_SUSPENDED');
    });

    it('rejects invalid password credentials with 401 INVALID_CREDENTIALS', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Credentials Test',
        email: 'creds@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'creds@manit.ac.in',
        password: 'WrongPassword!',
      });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects access to protected /me endpoint without a cookie with 401 UNAUTHORIZED', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns id, full_name, email_verified, role and never password_hash with valid cookie', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Me Endpoint User',
        email: 'meuser@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const otp = mailService.getLastSentMail().otp;
      await request(app).post('/api/auth/verify-otp').send({
        email: 'meuser@manit.ac.in',
        otp,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'meuser@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const cookie = loginRes.headers['set-cookie'];

      const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty('user');
      expect(meRes.body.user).toHaveProperty('id');
      expect(meRes.body.user).toHaveProperty('full_name', 'Me Endpoint User');
      expect(meRes.body.user).toHaveProperty('email_verified', true);
      expect(meRes.body.user).toHaveProperty('role', 'student');
      expect(meRes.body.user).not.toHaveProperty('password_hash');
    });

    it('rejects user whose status was updated to suspended after receiving token', async () => {
      await request(app).post('/api/auth/register').send({
        full_name: 'Later Suspended',
        email: 'latersuspended@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'latersuspended@manit.ac.in',
        password: 'SecurePassword123!',
      });

      const cookie = loginRes.headers['set-cookie'];

      // Suspend user in DB
      await db('users')
        .where({ email: 'latersuspended@manit.ac.in' })
        .update({ status: 'suspended' });

      // Next request with previously issued token
      const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

      expect(meRes.status).toBe(403);
      expect(meRes.body.error.code).toBe('USER_SUSPENDED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears authentication cookie and returns success message', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // Clearing cookie sets it to empty or past expiry
      expect(cookies.some((c) => c.includes('token=;') || c.includes('Max-Age=0'))).toBe(true);
    });
  });

  describe('Middleware unit integration', () => {
    it('requireVerified blocks unverified user with EMAIL_NOT_VERIFIED', async () => {
      const mockReq = {
        user: { id: 1, email_verified: false },
      };
      let respondedStatus;
      let respondedBody;
      const mockRes = {
        status: (s) => {
          respondedStatus = s;
          return {
            json: (b) => {
              respondedBody = b;
            },
          };
        },
      };
      let nextCalled = false;
      const mockNext = () => {
        nextCalled = true;
      };

      requireVerified(mockReq, mockRes, mockNext);

      expect(nextCalled).toBe(false);
      expect(respondedStatus).toBe(403);
      expect(respondedBody.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });
});
