import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';

describe('Requirement Backend API Integration Tests', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    await db('requirements').del();
    await db('rate_limit_events').del();
    await db('email_otps').del();
    await db('profiles').del();
    await db('users').del();
  });

  // Helper to create test user with complete or incomplete profile
  async function createTestUser({
    email = 'student@manit.ac.in',
    email_verified = true,
    full_name = 'Test Student',
    profile_complete = true,
    city = 'Bhopal',
  } = {}) {
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
      bio: profile_complete ? 'Quiet and neat computer science student.' : null,
      profile_completed: profile_complete,
    });

    const token = jwt.sign(
      { id: userId, email, role: 'student' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return { userId, email, token, cookie: `token=${token}` };
  }

  const validRequirementPayload = {
    city: 'Bhopal',
    budget_min: 5000,
    budget_max: 10000,
    move_in_date: '2026-11-01',
    gender_preference: 'same_gender_only',
    preferred_sleep_schedule: 'same_as_me',
    preferred_cleanliness_min: 3,
    smoking_ok: false,
    drinking_ok: false,
    food_preference: 'same_as_me',
    guests_ok: 'rarely',
    noise_tolerance: 'quiet',
    deal_breakers: 'No late night loud parties or indoor smoking.',
    importance_weights: {
      cleanliness: 3,
      sleep: 3,
      smoking: 3,
      drinking: 2,
      food: 2,
      guests: 2,
      noise: 3,
      social: 1,
    },
  };

  describe('Route protection & complete profile requirement', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const resGet = await request(app).get('/api/requirements/active');
      expect(resGet.status).toBe(401);
      expect(resGet.body.error.code).toBe('UNAUTHORIZED');

      const resPost = await request(app)
        .post('/api/requirements')
        .send(validRequirementPayload);
      expect(resPost.status).toBe(401);
      expect(resPost.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks unverified users with 403 EMAIL_NOT_VERIFIED', async () => {
      const { cookie } = await createTestUser({ email_verified: false, profile_complete: true });

      const resGet = await request(app)
        .get('/api/requirements/active')
        .set('Cookie', [cookie]);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error.code).toBe('EMAIL_NOT_VERIFIED');

      const resPost = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send(validRequirementPayload);
      expect(resPost.status).toBe(403);
      expect(resPost.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('blocks verified users with incomplete profile with 403 PROFILE_INCOMPLETE', async () => {
      const { cookie } = await createTestUser({ email_verified: true, profile_complete: false });

      const resGet = await request(app)
        .get('/api/requirements/active')
        .set('Cookie', [cookie]);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error.code).toBe('PROFILE_INCOMPLETE');

      const resPost = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send(validRequirementPayload);
      expect(resPost.status).toBe(403);
      expect(resPost.body.error.code).toBe('PROFILE_INCOMPLETE');
    });
  });

  describe('GET /api/requirements/active', () => {
    it('returns null requirement when user has not submitted any requirement yet', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const res = await request(app)
        .get('/api/requirements/active')
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ requirement: null });
    });

    it('returns the currently active requirement', async () => {
      const { cookie, userId } = await createTestUser({ profile_complete: true });

      await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send(validRequirementPayload);

      const res = await request(app)
        .get('/api/requirements/active')
        .set('Cookie', [cookie]);

      expect(res.status).toBe(200);
      expect(res.body.requirement).toBeDefined();
      expect(res.body.requirement.user_id).toBe(userId);
      expect(res.body.requirement.city).toBe('Bhopal');
      expect(res.body.requirement.budget_min).toBe(5000);
      expect(res.body.requirement.budget_max).toBe(10000);
      expect(res.body.requirement.is_active).toBe(true);
      expect(res.body.requirement.importance_weights).toEqual(validRequirementPayload.importance_weights);
    });
  });

  describe('POST /api/requirements', () => {
    it('successfully creates an active requirement and defaults city to profile city when city is omitted', async () => {
      const { cookie, userId } = await createTestUser({ profile_complete: true, city: 'Bhopal' });

      const payloadWithoutCity = { ...validRequirementPayload };
      delete payloadWithoutCity.city;

      const res = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send(payloadWithoutCity);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Requirement saved successfully.');
      expect(res.body.requirement).toBeDefined();
      expect(res.body.requirement.city).toBe('Bhopal');
      expect(res.body.requirement.is_active).toBe(true);

      // Verify in DB
      const dbRow = await db('requirements').where({ user_id: userId, is_active: 1 }).first();
      expect(dbRow).toBeDefined();
      expect(dbRow.city).toBe('Bhopal');
      expect(dbRow.is_active).toBe(1);
    });

    it('resubmitting archives the old requirement so that exactly one active requirement exists', async () => {
      const { cookie, userId } = await createTestUser({ profile_complete: true });

      // First submission
      const res1 = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          budget_min: 4000,
          budget_max: 8000,
        });
      expect(res1.status).toBe(201);
      const firstReqId = res1.body.requirement.id;

      // Second submission (editing / resubmitting)
      const res2 = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          budget_min: 6000,
          budget_max: 12000,
          preferred_cleanliness_min: 5,
        });
      expect(res2.status).toBe(201);
      const secondReqId = res2.body.requirement.id;
      expect(secondReqId).not.toBe(firstReqId);

      // CRITICAL VERIFICATION:
      // In the DB, the old row must now have is_active=0, and the new row must have is_active=1
      const oldRow = await db('requirements').where({ id: firstReqId }).first();
      expect(oldRow.is_active).toBe(0);

      const newRow = await db('requirements').where({ id: secondReqId }).first();
      expect(newRow.is_active).toBe(1);
      expect(Number(newRow.budget_min)).toBe(6000);
      expect(Number(newRow.budget_max)).toBe(12000);

      // Check total active rows for this user in DB: MUST BE EXACTLY ONE
      const activeRows = await db('requirements').where({ user_id: userId, is_active: 1 });
      expect(activeRows).toHaveLength(1);
      expect(activeRows[0].id).toBe(secondReqId);

      // Total rows for user is 2 (1 archived, 1 active)
      const allRows = await db('requirements').where({ user_id: userId });
      expect(allRows).toHaveLength(2);
    });
  });

  describe('Validation Failures', () => {
    it('rejects budget_max < budget_min with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const res = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          budget_min: 10000,
          budget_max: 5000, // Invalid: budget_max < budget_min
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/Maximum budget must be greater than or equal to minimum budget/i);
    });

    it('rejects cleanliness minimum outside 1 to 5 with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const resTooLow = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          preferred_cleanliness_min: 0,
        });
      expect(resTooLow.status).toBe(400);

      const resTooHigh = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          preferred_cleanliness_min: 6,
        });
      expect(resTooHigh.status).toBe(400);
    });

    it('rejects deal_breakers exceeding 400 characters with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const longDealBreakers = 'A'.repeat(401);
      const res = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          deal_breakers: longDealBreakers,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Deal-breakers cannot exceed 400 characters/i);
    });

    it('rejects importance_weights with invalid keys with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const res = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          importance_weights: {
            cleanliness: 2,
            unknown_dimension: 3, // disallowed key
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects importance_weights with value outside 1 to 3 with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const res = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          importance_weights: {
            cleanliness: 4, // Invalid: must be 1, 2, or 3
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid enum values for gender_preference and guests_ok with 400', async () => {
      const { cookie } = await createTestUser({ profile_complete: true });

      const resGender = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          gender_preference: 'invalid_choice',
        });
      expect(resGender.status).toBe(400);

      const resGuests = await request(app)
        .post('/api/requirements')
        .set('Cookie', [cookie])
        .send({
          ...validRequirementPayload,
          guests_ok: 'always', // Invalid
        });
      expect(resGuests.status).toBe(400);
    });
  });
});
