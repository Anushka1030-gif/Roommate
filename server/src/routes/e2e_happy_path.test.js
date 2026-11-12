import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app.js';
import db from '../db/index.js';
import config from '../config/index.js';
import mailService from '../services/mail.service.js';

describe('End-to-End Happy Path API Integration Test (Step 16)', () => {
  beforeAll(async () => {
    await db.migrate.latest();

    // Ensure database is clean for deterministic E2E flow
    await db('reports').del();
    await db('blocks').del();
    await db('messages').del();
    await db('conversations').del();
    await db('match_results').del();
    await db('requirements').del();
    await db('profiles').del();
    await db('email_otps').del();
    await db('users').del();

    // Seed admin user
    const adminPasswordHash = await bcrypt.hash(config.admin.password, 10);
    const [adminId] = await db('users').insert({
      email: config.admin.email,
      password_hash: adminPasswordHash,
      role: 'admin',
      email_verified: 1,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await db('profiles').insert({
      user_id: adminId,
      full_name: 'RoomieMatch Administrator',
      profile_completed: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  it('executes full happy path: register -> verify OTP -> profile -> requirement -> matches -> start chat -> both share contact -> both confirm roommates -> admin stats show confirmed pair', async () => {
    // -------------------------------------------------------------
    // STEP 1: Student A Registration & OTP Verification
    // -------------------------------------------------------------
    const regResA = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Aarav Sharma',
        email: 'aarav.sharma@manit.ac.in',
        password: 'Password123!',
      });
    expect(regResA.status).toBe(201);
    expect(regResA.body.email).toBe('aarav.sharma@manit.ac.in');

    const otpA = mailService.getLastSentMail().otp;
    expect(otpA).toBeDefined();

    const verifyResA = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'aarav.sharma@manit.ac.in',
        otp: otpA,
      });
    expect(verifyResA.status).toBe(200);

    const loginResA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'aarav.sharma@manit.ac.in',
        password: 'Password123!',
      });
    expect(loginResA.status).toBe(200);
    const cookieA = loginResA.headers['set-cookie'];
    const userA = loginResA.body.user;
    expect(userA.email_verified).toBe(true);

    // Complete Student A profile
    const profileResA = await request(app)
      .put('/api/profile/me')
      .set('Cookie', cookieA)
      .send({
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
        bio: 'Pre-final year CS student at MANIT looking for a tidy study partner.',
      });
    expect(profileResA.status).toBe(200);
    expect(profileResA.body.profile.profile_completed).toBe(true);

    // Add Student A phone
    const phoneResA = await request(app)
      .put('/api/account/phone')
      .set('Cookie', cookieA)
      .send({ phone: '+919876511111' });
    expect(phoneResA.status).toBe(200);

    // Submit Student A requirements
    const reqResA = await request(app)
      .post('/api/requirements')
      .set('Cookie', cookieA)
      .send({
        city: 'Bhopal',
        budget_min: 7000,
        budget_max: 12000,
        gender_preference: 'any',
        preferred_sleep_schedule: 'early_bird',
        preferred_cleanliness_min: 3,
        smoking_ok: false,
        drinking_ok: false,
        food_preference: 'any',
        guests_ok: 'rarely',
        noise_tolerance: 'quiet',
      });
    expect(reqResA.status).toBe(201);

    // -------------------------------------------------------------
    // STEP 2: Student B Registration & OTP Verification
    // -------------------------------------------------------------
    const regResB = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Rohan Verma',
        email: 'rohan.verma@manit.ac.in',
        password: 'Password123!',
      });
    expect(regResB.status).toBe(201);

    const otpB = mailService.getLastSentMail().otp;
    expect(otpB).toBeDefined();

    const verifyResB = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'rohan.verma@manit.ac.in',
        otp: otpB,
      });
    expect(verifyResB.status).toBe(200);

    const loginResB = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'rohan.verma@manit.ac.in',
        password: 'Password123!',
      });
    expect(loginResB.status).toBe(200);
    const cookieB = loginResB.headers['set-cookie'];
    const userB = loginResB.body.user;

    // Complete Student B profile
    const profileResB = await request(app)
      .put('/api/profile/me')
      .set('Cookie', cookieB)
      .send({
        full_name: 'Rohan Verma',
        age: 22,
        gender: 'male',
        college_name: 'MANIT Bhopal',
        major: 'Mechanical Engineering',
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
        bio: 'Quiet mechanical engineer, early riser, loves neat rooms.',
      });
    expect(profileResB.status).toBe(200);

    // Add Student B phone
    const phoneResB = await request(app)
      .put('/api/account/phone')
      .set('Cookie', cookieB)
      .send({ phone: '+919876522222' });
    expect(phoneResB.status).toBe(200);

    // Submit Student B requirements
    const reqResB = await request(app)
      .post('/api/requirements')
      .set('Cookie', cookieB)
      .send({
        city: 'Bhopal',
        budget_min: 8000,
        budget_max: 11000,
        gender_preference: 'any',
        preferred_sleep_schedule: 'early_bird',
        preferred_cleanliness_min: 3,
        smoking_ok: false,
        drinking_ok: false,
        food_preference: 'any',
        guests_ok: 'rarely',
        noise_tolerance: 'quiet',
      });
    expect(reqResB.status).toBe(201);

    // -------------------------------------------------------------
    // STEP 3: Create Candidate C & D to ensure healthy candidate pool
    // -------------------------------------------------------------
    const createCandidate = async (name, email) => {
      const passwordHash = await bcrypt.hash('Password123!', 4);
      const [candId] = await db('users').insert({
        email,
        password_hash: passwordHash,
        role: 'student',
        email_verified: 1,
        status: 'active',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      await db('profiles').insert({
        user_id: candId,
        full_name: name,
        age: 21,
        gender: 'male',
        college_name: 'MANIT Bhopal',
        major: 'Civil Engineering',
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
        bio: 'Friendly student in Bhopal.',
        profile_completed: 1,
      });
      await db('requirements').insert({
        user_id: candId,
        city: 'Bhopal',
        budget_min: 7500,
        budget_max: 11500,
        preferred_sleep_schedule: 'early_bird',
        preferred_cleanliness_min: 3,
        smoking_ok: 0,
        drinking_ok: 0,
        is_active: 1,
      });
    };

    await createCandidate('Kabir Singh', 'kabir@manit.ac.in');
    await createCandidate('Devansh Patel', 'devansh@manit.ac.in');

    // -------------------------------------------------------------
    // STEP 4: Matches Generation and Retrieval
    // -------------------------------------------------------------
    // Refresh/run matching for Student A
    const refreshRes = await request(app)
      .post('/api/matches/refresh')
      .set('Cookie', cookieA);
    expect(refreshRes.status).toBe(200);

    const matchesRes = await request(app)
      .get('/api/matches')
      .set('Cookie', cookieA);
    expect(matchesRes.status).toBe(200);
    expect(matchesRes.body.matches).toBeInstanceOf(Array);
    expect(matchesRes.body.matches.length).toBeGreaterThanOrEqual(1);

    // Verify candidate Rohan (Student B) is in Student A's matches
    const matchWithB = matchesRes.body.matches.find(
      (m) => m.candidate_id === userB.id || m.matched_user_id === userB.id
    );
    expect(matchWithB).toBeDefined();
    expect(matchWithB.compatibility_score).toBeGreaterThan(60);

    // STRICT PRIVACY: Verify candidate email and phone are NOT exposed in matches
    expect(matchWithB).not.toHaveProperty('email');
    expect(matchWithB).not.toHaveProperty('phone');
    expect(matchWithB.user).not.toHaveProperty('email');
    expect(matchWithB.user).not.toHaveProperty('phone');

    // -------------------------------------------------------------
    // STEP 5: Start Conversation & Exchange Messages
    // -------------------------------------------------------------
    const startChatRes = await request(app)
      .post('/api/conversations')
      .set('Cookie', cookieA)
      .send({
        candidate_user_id: userB.id,
      });
    expect(startChatRes.status).toBe(201);
    const conversationId = startChatRes.body.conversation.id;
    expect(conversationId).toBeDefined();

    // Student A sends a message
    const msg1Res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA)
      .send({
        content: 'Hi Rohan! We matched on RoomieMatch and have similar study habits. Interested in teaming up?',
      });
    expect(msg1Res.status).toBe(201);

    // Student A sends a second message
    const msg2Res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA)
      .send({
        content: 'I am checking out 2BHKs near Mata Mandir road.',
      });
    expect(msg2Res.status).toBe(201);

    // Student B views conversation and messages
    const studentBConvos = await request(app)
      .get('/api/conversations')
      .set('Cookie', cookieB);
    expect(studentBConvos.status).toBe(200);
    expect(studentBConvos.body.conversations.some((c) => c.id === conversationId)).toBe(true);

    const msgsForB = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieB);
    expect(msgsForB.status).toBe(200);
    expect(msgsForB.body.messages.length).toBe(2);

    // Student B replies
    const replyRes = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieB)
      .send({
        content: 'Hi Aarav! That sounds great, I would love to connect and discuss budgets.',
      });
    expect(replyRes.status).toBe(201);

    // -------------------------------------------------------------
    // STEP 6: Mutual Consent Contact Sharing
    // -------------------------------------------------------------
    // 1. Before sharing, contact fetch MUST fail with 403 CONTACT_NOT_SHARED
    const preContactA = await request(app)
      .get(`/api/conversations/${conversationId}/contact`)
      .set('Cookie', cookieA);
    expect(preContactA.status).toBe(403);
    expect(preContactA.body.error.code).toBe('CONTACT_NOT_SHARED');

    // 2. Student A shares contact
    const shareResA = await request(app)
      .post(`/api/conversations/${conversationId}/share-contact`)
      .set('Cookie', cookieA)
      .send({ share: true });
    expect(shareResA.status).toBe(200);
    expect(shareResA.body.my_share).toBe(true);
    expect(shareResA.body.both_shared).toBe(false);

    // 3. Still blocked until Student B also shares
    const halfContactA = await request(app)
      .get(`/api/conversations/${conversationId}/contact`)
      .set('Cookie', cookieA);
    expect(halfContactA.status).toBe(403);
    expect(halfContactA.body.error.code).toBe('CONTACT_NOT_SHARED');

    // 4. Student B shares contact
    const shareResB = await request(app)
      .post(`/api/conversations/${conversationId}/share-contact`)
      .set('Cookie', cookieB)
      .send({ share: true });
    expect(shareResB.status).toBe(200);
    expect(shareResB.body.both_shared).toBe(true);

    // 5. Both users can now securely access each other's contact details
    const contactForA = await request(app)
      .get(`/api/conversations/${conversationId}/contact`)
      .set('Cookie', cookieA);
    expect(contactForA.status).toBe(200);
    expect(contactForA.body.contact.email).toBe('rohan.verma@manit.ac.in');
    expect(contactForA.body.contact.phone).toBe('+919876522222');

    const contactForB = await request(app)
      .get(`/api/conversations/${conversationId}/contact`)
      .set('Cookie', cookieB);
    expect(contactForB.status).toBe(200);
    expect(contactForB.body.contact.email).toBe('aarav.sharma@manit.ac.in');
    expect(contactForB.body.contact.phone).toBe('+919876511111');

    // -------------------------------------------------------------
    // STEP 7: Confirm "We became roommates"
    // -------------------------------------------------------------
    // Student A confirms
    const confirmResA = await request(app)
      .post(`/api/conversations/${conversationId}/confirm-roommates`)
      .set('Cookie', cookieA);
    expect(confirmResA.status).toBe(200);
    expect(confirmResA.body.me_confirmed).toBe(true);
    expect(confirmResA.body.both_confirmed).toBe(false);

    // Student B confirms
    const confirmResB = await request(app)
      .post(`/api/conversations/${conversationId}/confirm-roommates`)
      .set('Cookie', cookieB);
    expect(confirmResB.status).toBe(200);
    expect(confirmResB.body.me_confirmed).toBe(true);
    expect(confirmResB.body.both_confirmed).toBe(true);
    expect(confirmResB.body.roommate_status).toBe('confirmed');

    // -------------------------------------------------------------
    // STEP 8: Admin Statistics Verification
    // -------------------------------------------------------------
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.admin.email,
        password: config.admin.password,
      });
    expect(adminLoginRes.status).toBe(200);
    const adminCookie = adminLoginRes.headers['set-cookie'];

    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', adminCookie);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats).toBeDefined();

    // Verify north-star metric: Confirmed Roommate Pairs is at least 1
    expect(statsRes.body.stats.confirmed_roommate_pairs).toBe(1);
    expect(statsRes.body.stats.contact_share_agreements).toBe(1);
    expect(statsRes.body.stats.conversations).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.stats.total_users).toBeGreaterThanOrEqual(3);
    expect(statsRes.body.stats.verified_users).toBeGreaterThanOrEqual(3);
  });
});
