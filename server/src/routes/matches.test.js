import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';

describe('Match Routes Integration Tests (/api/matches)', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    await db('match_results').del();
    await db('blocks').del();
    await db('requirements').del();
    await db('rate_limit_events').del();
    await db('email_otps').del();
    await db('profiles').del();
    await db('users').del();
  });

  async function createTestStudent({
    email = 'student@manit.ac.in',
    full_name = 'Test Student',
    email_verified = true,
    profile_complete = true,
    city = 'Bhopal',
    gender = 'male',
    cleanliness = 4,
    sleep = 'early_bird',
    budget_min = 7000,
    budget_max = 12000,
    has_active_req = true,
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
      gender: profile_complete ? gender : null,
      college_name: profile_complete ? 'MANIT Bhopal' : null,
      major: profile_complete ? 'Computer Science' : null,
      graduation_year: profile_complete ? 2026 : null,
      city: profile_complete ? city : null,
      sleep_schedule: profile_complete ? sleep : null,
      cleanliness_level: profile_complete ? cleanliness : null,
      study_habits: profile_complete ? 'silent' : null,
      noise_level: profile_complete ? 'quiet' : null,
      smoking_preference: profile_complete ? 'no' : null,
      drinking_preference: profile_complete ? 'no' : null,
      food_preference: profile_complete ? 'vegetarian' : null,
      pet_preference: profile_complete ? 'no_pets' : null,
      guest_policy: profile_complete ? 'rarely' : null,
      bio: profile_complete ? 'Student seeking roommate' : null,
      profile_completed: profile_complete,
    });

    if (has_active_req && profile_complete) {
      await db('requirements').insert({
        user_id: userId,
        city,
        budget_min,
        budget_max,
        gender_preference: 'same_gender_only',
        preferred_sleep_schedule: 'early_bird',
        preferred_cleanliness_min: 3,
        smoking_ok: 0,
        drinking_ok: 0,
        food_preference: 'vegetarian',
        guests_ok: 'rarely',
        noise_tolerance: 'quiet',
        deal_breakers: null,
        importance_weights: JSON.stringify({
          cleanliness: 2,
          sleep: 2,
          smoking: 2,
          drinking: 2,
          food: 2,
          guests: 2,
          noise: 2,
          social: 2,
        }),
        is_active: 1,
      });
    }

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
      const res = await request(app).get('/api/matches');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks unverified users with 403 EMAIL_NOT_VERIFIED', async () => {
      const { cookie } = await createTestStudent({
        email: 'unverified@manit.ac.in',
        email_verified: false,
      });

      const res = await request(app).get('/api/matches').set('Cookie', [cookie]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('blocks users with incomplete profiles with 403 PROFILE_INCOMPLETE', async () => {
      const { cookie } = await createTestStudent({
        email: 'incomplete@manit.ac.in',
        email_verified: true,
        profile_complete: false,
      });

      const res = await request(app).get('/api/matches').set('Cookie', [cookie]);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PROFILE_INCOMPLETE');
    });
  });

  describe('GET /api/matches', () => {
    it('returns top 3 compatible roommate match cards with score, highlights, and explanations', async () => {
      const { cookie: reqCookie } = await createTestStudent({
        email: 'requester@manit.ac.in',
        full_name: 'Aarav Sharma',
      });

      // Create 4 candidates in the same city
      for (let i = 1; i <= 4; i++) {
        await createTestStudent({
          email: `candidate${i}@manit.ac.in`,
          full_name: `Candidate ${i}`,
          cleanliness: 4,
          sleep: 'early_bird',
        });
      }

      const res = await request(app).get('/api/matches').set('Cookie', [reqCookie]);

      expect(res.status).toBe(200);
      expect(res.body.matches).toHaveLength(3);
      expect(res.body.count).toBe(3);
      expect(res.body.has_enough_matches).toBe(true);
      expect(res.body.message).toBeNull();

      const firstMatch = res.body.matches[0];
      expect(firstMatch.score).toBeGreaterThanOrEqual(80);
      expect(firstMatch.highlights.length).toBeGreaterThanOrEqual(2);
      expect(firstMatch.explanation).toContain('Candidate');
      expect(firstMatch.icebreakers.length).toBe(2);
      expect(firstMatch.score_breakdown).toBeDefined();
    });

    it('STRICT PRIVACY CHECK: ensures candidate email, phone, and password_hash are NEVER exposed', async () => {
      const { cookie: reqCookie } = await createTestStudent({
        email: 'privacy_seeker@manit.ac.in',
      });

      await createTestStudent({
        email: 'secret_candidate@manit.ac.in',
        full_name: 'Secret Candidate',
      });

      const res = await request(app).get('/api/matches').set('Cookie', [reqCookie]);
      expect(res.status).toBe(200);

      for (const match of res.body.matches) {
        expect(match.user.email).toBeUndefined();
        expect(match.user.phone).toBeUndefined();
        expect(match.user.password_hash).toBeUndefined();
        expect(JSON.stringify(match)).not.toContain('secret_candidate@manit.ac.in');
      }
    });

    it('serves cached matches without recalculating if already generated', async () => {
      const { cookie: reqCookie, userId: reqId } = await createTestStudent({
        email: 'cached_seeker@manit.ac.in',
      });
      const { userId: candId } = await createTestStudent({
        email: 'candidate_cached@manit.ac.in',
        full_name: 'Custom Cached Name',
      });

      // Insert an existing cached row
      await db('match_results').insert({
        user_id: reqId,
        matched_user_id: candId,
        compatibility_score: 94.0,
        score_breakdown: JSON.stringify({ cleanliness: 95, sleep: 95 }),
        ai_summary: 'Pre-existing cached explanation test',
        ai_pros: JSON.stringify(['High compatibility']),
        ai_cons: JSON.stringify([]),
        ai_icebreakers: JSON.stringify(['Ask about classes']),
        status: 'suggested',
      });

      const res = await request(app).get('/api/matches').set('Cookie', [reqCookie]);

      expect(res.status).toBe(200);
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].score).toBe(94);
      expect(res.body.matches[0].explanation).toBe('Pre-existing cached explanation test');
      expect(res.body.matches[0].user.full_name).toBe('Custom Cached Name');
    });

    it('returns empty message if candidate pool in city is smaller than 3', async () => {
      const { cookie: reqCookie } = await createTestStudent({
        email: 'few_matches@manit.ac.in',
      });

      // Only 1 candidate exists
      await createTestStudent({ email: 'only_cand@manit.ac.in' });

      const res = await request(app).get('/api/matches').set('Cookie', [reqCookie]);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.has_enough_matches).toBe(false);
      expect(res.body.message).toMatch(/Not enough matches yet in your city/i);
    });
  });

  describe('POST /api/matches/refresh', () => {
    it('forces re-evaluation of matches and updates match_results cache', async () => {
      const { cookie: reqCookie, userId: reqId } = await createTestStudent({
        email: 'refresh_tester@manit.ac.in',
      });

      for (let i = 1; i <= 3; i++) {
        await createTestStudent({ email: `cand_refresh_${i}@manit.ac.in` });
      }

      // Initial get
      const resInitial = await request(app).get('/api/matches').set('Cookie', [reqCookie]);
      expect(resInitial.status).toBe(200);

      // Refresh
      const resRefresh = await request(app)
        .post('/api/matches/refresh')
        .set('Cookie', [reqCookie]);

      expect(resRefresh.status).toBe(200);
      expect(resRefresh.body.matches).toHaveLength(3);

      const dbMatches = await db('match_results').where({ user_id: reqId });
      expect(dbMatches).toHaveLength(3);
    });
  });

  describe('Requirement Submission Hook Trigger', () => {
    it('POST /api/requirements automatically runs matching engine and populates match_results', async () => {
      const { cookie: reqCookie, userId: reqId } = await createTestStudent({
        email: 'req_trigger@manit.ac.in',
        has_active_req: false,
      });

      // Create candidates in Bhopal
      for (let i = 1; i <= 3; i++) {
        await createTestStudent({ email: `trigger_cand_${i}@manit.ac.in` });
      }

      // Verify no match results exist before submitting
      const beforeMatches = await db('match_results').where({ user_id: reqId });
      expect(beforeMatches).toHaveLength(0);

      // Submit requirement
      const postRes = await request(app)
        .post('/api/requirements')
        .set('Cookie', [reqCookie])
        .send({
          city: 'Bhopal',
          budget_min: 7000,
          budget_max: 12000,
          gender_preference: 'same_gender_only',
          preferred_sleep_schedule: 'early_bird',
          preferred_cleanliness_min: 3,
          smoking_ok: false,
          drinking_ok: false,
          food_preference: 'vegetarian_only',
          guests_ok: 'rarely',

          noise_tolerance: 'quiet',
          deal_breakers: null,
          importance_weights: {
            cleanliness: 2,
            sleep: 2,
          },
        });

      expect(postRes.status).toBe(201);

      // Verify match_results was immediately populated by the hook
      const afterMatches = await db('match_results').where({ user_id: reqId });
      expect(afterMatches).toHaveLength(3);
    });
  });

  describe('PATCH /api/matches/:id/status and Status Filtering', () => {
    it('updates status to liked and allows filtering by status', async () => {
      const { cookie: reqCookie, userId: reqId } = await createTestStudent({
        email: 'status_tester@manit.ac.in',
      });
      const { userId: candId } = await createTestStudent({
        email: 'cand_status@manit.ac.in',
        full_name: 'Status Candidate',
      });

      const [matchId] = await db('match_results').insert({
        user_id: reqId,
        matched_user_id: candId,
        compatibility_score: 92.0,
        score_breakdown: JSON.stringify({ cleanliness: 90 }),
        ai_summary: 'Status test explanation',
        ai_pros: JSON.stringify(['Good fit']),
        ai_cons: JSON.stringify([]),
        ai_icebreakers: JSON.stringify(['Say hello']),
        status: 'suggested',
      });

      // Update status to liked
      const patchRes = await request(app)
        .patch(`/api/matches/${matchId}/status`)
        .set('Cookie', [reqCookie])
        .send({ status: 'liked' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.status).toBe('liked');

      // Check database update
      const dbRow = await db('match_results').where({ id: matchId }).first();
      expect(dbRow.status).toBe('liked');

      // Query with status filter
      const getLikedRes = await request(app)
        .get('/api/matches?status=liked')
        .set('Cookie', [reqCookie]);

      expect(getLikedRes.status).toBe(200);
      expect(getLikedRes.body.matches).toHaveLength(1);
      expect(getLikedRes.body.matches[0].status).toBe('liked');

      // Query with status filter that should be empty
      const getSkippedRes = await request(app)
        .get('/api/matches?status=skipped')
        .set('Cookie', [reqCookie]);

      expect(getSkippedRes.status).toBe(200);
      expect(getSkippedRes.body.matches).toHaveLength(0);
    });

    it('rejects invalid status value with 400', async () => {
      const { cookie: reqCookie } = await createTestStudent({
        email: 'invalid_status@manit.ac.in',
      });

      const res = await request(app)
        .patch('/api/matches/9999/status')
        .set('Cookie', [reqCookie])
        .send({ status: 'invalid_status_enum' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS');
    });

    it('returns 404 if match result does not exist for this user', async () => {
      const { cookie: reqCookie } = await createTestStudent({
        email: 'missing_match@manit.ac.in',
      });

      const res = await request(app)
        .patch('/api/matches/99999/status')
        .set('Cookie', [reqCookie])
        .send({ status: 'liked' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MATCH_NOT_FOUND');
    });
  });
});

