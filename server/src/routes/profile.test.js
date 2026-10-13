import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';

describe('Profile and Account Backend API Integration Tests', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    await db('rate_limit_events').del();
    await db('email_otps').del();
    await db('profiles').del();
    await db('users').del();
  });

  // Helper to create test user with token
  async function createTestUser({ email = 'student@manit.ac.in', email_verified = true, full_name = 'Test Student' } = {}) {
    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);
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
      profile_completed: false,
    });

    const token = jwt.sign(
      { id: userId, email, role: 'student' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return { userId, email, token, cookie: `token=${token}` };
  }

  const validCompleteProfilePayload = {
    full_name: 'Aarav Sharma',
    age: 21,
    gender: 'male',
    college_name: 'MANIT Bhopal',
    major: 'Computer Science',
    graduation_year: 2026,
    city: 'Bhopal',
    sleep_schedule: 'early_bird',
    cleanliness_level: 4,
    study_habits: 'silent',
    noise_level: 'quiet',
    smoking_preference: 'no',
    drinking_preference: 'no',
    food_preference: 'vegetarian',
    pet_preference: 'no_pets',
    guest_policy: 'rarely',
    bio: 'Looking for a focused and calm study atmosphere.',
  };

  describe('Route protection & authorization', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const resGet = await request(app).get('/api/profile/me');
      expect(resGet.status).toBe(401);
      expect(resGet.body.error.code).toBe('UNAUTHORIZED');

      const resPut = await request(app).put('/api/profile/me').send(validCompleteProfilePayload);
      expect(resPut.status).toBe(401);
      expect(resPut.body.error.code).toBe('UNAUTHORIZED');

      const resPhone = await request(app).put('/api/account/phone').send({ phone: '+919876543210' });
      expect(resPhone.status).toBe(401);
      expect(resPhone.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks unverified users with 403 EMAIL_NOT_VERIFIED', async () => {
      const { cookie } = await createTestUser({ email_verified: false });

      const resGet = await request(app)
        .get('/api/profile/me')
        .set('Cookie', [cookie]);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      const resPut = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send(validCompleteProfilePayload);
      expect(resPut.status).toBe(403);
      expect(resPut.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      const resPhone = await request(app)
        .put('/api/account/phone')
        .set('Cookie', [cookie])
        .send({ phone: '+919876543210' });
      expect(resPhone.status).toBe(403);
      expect(resPhone.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('GET /api/profile/me', () => {
    it('returns initial profile and never includes email or phone', async () => {
      const { cookie, userId } = await createTestUser({ full_name: 'Priya Patel' });

      // Ensure a phone exists on users table to verify it is NEVER returned
      await db('users').where({ id: userId }).update({ phone: '+919876543210' });
      await db('profiles').where({ user_id: userId }).update({ phone: '+919876543210' });

      const res = await request(app)
        .get('/api/profile/me')
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profile');
      expect(res.body).toHaveProperty('profile_complete', false);
      expect(res.body).toHaveProperty('completeness_percentage');
      expect(typeof res.body.completeness_percentage).toBe('number');

      const profile = res.body.profile;
      expect(profile.full_name).toBe('Priya Patel');

      // CRITICAL: Privacy check - never return email or phone
      expect(profile).not.toHaveProperty('email');
      expect(profile).not.toHaveProperty('phone');
      expect(profile).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('phone');
    });
  });

  describe('PUT /api/profile/me', () => {
    it('creates/completes a profile and computes 100% completeness', async () => {
      const { cookie, userId } = await createTestUser();

      const res = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send(validCompleteProfilePayload);

      expect(res.status).toBe(200);
      expect(res.body.profile_complete).toBe(true);
      expect(res.body.completeness_percentage).toBe(100);

      const profile = res.body.profile;
      expect(profile.full_name).toBe('Aarav Sharma');
      expect(profile.age).toBe(21);
      expect(profile.gender).toBe('male');
      expect(profile.college_name).toBe('MANIT Bhopal');
      expect(profile.major).toBe('Computer Science');
      expect(profile.graduation_year).toBe(2026);
      expect(profile.city).toBe('Bhopal');
      expect(profile.cleanliness_level).toBe(4);
      expect(profile.bio).toBe('Looking for a focused and calm study atmosphere.');

      // Check privacy: no email or phone
      expect(profile).not.toHaveProperty('email');
      expect(profile).not.toHaveProperty('phone');

      // Verify DB persistence
      const dbProfile = await db('profiles').where({ user_id: userId }).first();
      expect(dbProfile).toBeDefined();
      expect(dbProfile.profile_completed).toBe(1);
      expect(dbProfile.city).toBe('Bhopal');
      expect(dbProfile.age).toBe(21);
    });

    it('updates an existing profile cleanly', async () => {
      const { cookie, userId } = await createTestUser();

      // First complete
      await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send(validCompleteProfilePayload);

      // Then update specific fields
      const resUpdate = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({
          major: 'Data Science & AI',
          cleanliness_level: 5,
          bio: 'Updated bio note.',
        });

      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.profile.major).toBe('Data Science & AI');
      expect(resUpdate.body.profile.cleanliness_level).toBe(5);
      expect(resUpdate.body.profile.bio).toBe('Updated bio note.');
      expect(resUpdate.body.profile_complete).toBe(true);
      expect(resUpdate.body.completeness_percentage).toBe(100);

      const dbProfile = await db('profiles').where({ user_id: userId }).first();
      expect(dbProfile.major).toBe('Data Science & AI');
      expect(dbProfile.cleanliness_level).toBe(5);
    });

    it('correctly calculates partial completeness without bio or phone', async () => {
      const { cookie } = await createTestUser({ full_name: 'Rohan Verma' });

      // Provide only 8 of the 16 required fields
      const partialPayload = {
        full_name: 'Rohan Verma',
        age: 22,
        gender: 'male',
        college_name: 'MANIT Bhopal',
        major: 'Civil Engineering',
        graduation_year: 2025,
        city: 'Bhopal',
        sleep_schedule: 'night_owl',
        // bio is provided, but should NOT count towards required 16
        bio: 'I am a night owl.',
      };

      const res = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send(partialPayload);

      expect(res.status).toBe(200);
      expect(res.body.profile_complete).toBe(false);
      // 9 filled out of 16 required (including default cleanliness_level) = 56%
      expect(res.body.completeness_percentage).toBe(56);
    });
  });

  describe('Validation failures', () => {
    it('rejects age outside 17 to 40', async () => {
      const { cookie } = await createTestUser();

      const resYoung = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ age: 16 });
      expect(resYoung.status).toBe(400);
      expect(resYoung.body.error.message).toMatch(/age/i);

      const resOld = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ age: 41 });
      expect(resOld.status).toBe(400);
      expect(resOld.body.error.message).toMatch(/age/i);
    });

    it('rejects cleanliness outside 1 to 5', async () => {
      const { cookie } = await createTestUser();

      const resLow = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ cleanliness_level: 0 });
      expect(resLow.status).toBe(400);
      expect(resLow.body.error.message).toMatch(/cleanliness/i);

      const resHigh = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ cleanliness_level: 6 });
      expect(resHigh.status).toBe(400);
      expect(resHigh.body.error.message).toMatch(/cleanliness/i);
    });

    it('rejects bio longer than 600 characters', async () => {
      const { cookie } = await createTestUser();

      const longBio = 'x'.repeat(601);
      const res = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ bio: longBio });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/bio/i);
    });

    it('rejects city outside SUPPORTED_CITIES', async () => {
      const { cookie } = await createTestUser();

      const res = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ city: 'Delhi' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/city/i);
    });

    it('rejects invalid enum values', async () => {
      const { cookie } = await createTestUser();

      const res = await request(app)
        .put('/api/profile/me')
        .set('Cookie', [cookie])
        .send({ sleep_schedule: 'night_sleeper' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/sleep schedule/i);
    });
  });

  describe('PUT /api/account/phone', () => {
    it('validates format and stores phone on users.phone', async () => {
      const { cookie, userId } = await createTestUser();

      const res = await request(app)
        .put('/api/account/phone')
        .set('Cookie', [cookie])
        .send({ phone: '+919876543210' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/phone number updated/i);

      const dbUser = await db('users').where({ id: userId }).first();
      expect(dbUser.phone).toBe('+919876543210');

      // Verify phone is NOT exposed via profile
      const resGet = await request(app)
        .get('/api/profile/me')
        .set('Cookie', [cookie]);
      expect(resGet.body.profile).not.toHaveProperty('phone');
    });

    it('rejects invalid phone numbers with 400', async () => {
      const { cookie } = await createTestUser();

      const res = await request(app)
        .put('/api/account/phone')
        .set('Cookie', [cookie])
        .send({ phone: 'invalid-phone-123' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/phone/i);
    });
  });
});
