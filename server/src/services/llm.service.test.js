import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  LLMService,
  BaseLLMProvider,
  buildPromptPayload,
  parseAndValidateLLMResponse,
  stripMarkdownFences,
  loadMatchingSystemPrompt,
  safeLogError,
} from './llm.service.js';
import { runMatching } from './matching.service.js';
import db from '../db/index.js';

describe('LLM Service & Matching Layer Tests', () => {
  const originalEnv = process.env;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Prompt loading and Strip Markdown Fences', () => {
    it('loads the matching system prompt from disk at runtime', () => {
      const prompt = loadMatchingSystemPrompt();
      expect(prompt).toContain('You are a roommate compatibility expert for students.');
      expect(prompt).toContain('Pick the 3 most compatible candidates and rank them best first.');
      expect(prompt).toContain('Return ONLY valid JSON, no markdown');
    });

    it('strips markdown fences from responses', () => {
      const raw = '```json\n{"matches": []}\n```';
      expect(stripMarkdownFences(raw)).toBe('{"matches": []}');

      const rawNoLang = '```\n{"matches": []}\n```';
      expect(stripMarkdownFences(rawNoLang)).toBe('{"matches": []}');

      const plain = '{"matches": []}';
      expect(stripMarkdownFences(plain)).toBe('{"matches": []}');
    });
  });

  describe('Data Privacy & No PII in Payload', () => {
    it('buildPromptPayload strictly excludes email, phone, full_name, and contact info', () => {
      const seeker = {
        id: 1,
        user_id: 1,
        full_name: 'John Doe',
        email: 'john.doe@manit.ac.in',
        phone: '+919876543210',
        age: 21,
        gender: 'male',
        city: 'Bhopal',
        college_name: 'MANIT Bhopal',
        bio: 'CS student looking for quiet roommate.',
        sleep_schedule: 'early_bird',
        cleanliness_level: 4,
        noise_level: 'quiet',
        food_preference: 'vegetarian',
        smoking_preference: 'no',
        drinking_preference: 'no',
        study_habits: 'silent',
        guest_policy: 'rarely',
        pet_preference: 'no_pets',
      };

      const requirement = {
        city: 'Bhopal',
        budget_min: 6000,
        budget_max: 10000,
        gender_preference: 'same_gender_only',
        preferred_sleep_schedule: 'early_bird',
        preferred_cleanliness_min: 3,
        smoking_ok: false,
        drinking_ok: false,
        food_preference: 'vegetarian_only',
        guests_ok: 'rarely',
        noise_tolerance: 'quiet',
        deal_breakers: 'No late night parties',
        importance_weights: { cleanliness: 3, sleep: 2 },
      };

      const shortlist = [
        {
          candidate_id: 2,
          score: 88,
          compatibility_score: 88,
          user: {
            id: 2,
            user_id: 2,
            full_name: 'Candidate Two',
            email: 'candidate2@manit.ac.in',
            phone: '+919988776655',
            age: 22,
            college_name: 'MANIT Bhopal',
            bio: 'ECE student who loves coding.',
            sleep_schedule: 'early_bird',
            cleanliness_level: 4,
            noise_level: 'quiet',
            food_preference: 'vegetarian',
            smoking_preference: 'no',
            drinking_preference: 'no',
            study_habits: 'silent',
            guest_policy: 'rarely',
            pet_preference: 'no_pets',
          },
          requirement: {
            budget_min: 7000,
            budget_max: 11000,
          },
        },
      ];

      const payload = buildPromptPayload({ seeker, requirement, shortlist });

      // Convert payload to JSON string and inspect every key/value
      const jsonString = JSON.stringify(payload);

      // 1. Ensure private identifiers are absent
      expect(jsonString).not.toContain('john.doe@manit.ac.in');
      expect(jsonString).not.toContain('candidate2@manit.ac.in');
      expect(jsonString).not.toContain('+919876543210');
      expect(jsonString).not.toContain('+919988776655');
      expect(jsonString).not.toContain('John Doe');
      expect(jsonString).not.toContain('Candidate Two');

      // 2. Recursive key check: no keys named email, phone, full_name, password
      const forbiddenKeys = ['email', 'phone', 'full_name', 'password', 'password_hash'];
      function checkObjectKeys(obj) {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
          expect(forbiddenKeys).not.toContain(key.toLowerCase());
          checkObjectKeys(obj[key]);
        }
      }
      checkObjectKeys(payload);

      // 3. String value check: no email '@' or phone numbers in values
      function checkValues(obj) {
        if (typeof obj === 'string') {
          expect(obj).not.toMatch(/@/);
          expect(obj).not.toMatch(/\+?\d{10,12}/);
        } else if (obj && typeof obj === 'object') {
          for (const val of Object.values(obj)) {
            checkValues(val);
          }
        }
      }
      checkValues(payload);

      // 4. Seeker and candidate fields are correctly anonymized
      expect(payload.seeker.profile.age).toBe(21);
      expect(payload.seeker.profile.college_or_company).toBe('MANIT Bhopal');
      expect(payload.shortlist[0].candidate_id).toBe(2);
      expect(payload.shortlist[0].pre_score).toBe(88);
      expect(payload.shortlist[0].college_or_company).toBe('MANIT Bhopal');
    });
  });

  describe('Zod Schema Validation', () => {
    it('validates a correct LLM response matching the PRD schema', () => {
      const validText = JSON.stringify({
        matches: [
          {
            candidate_id: 10,
            score: 92,
            explanation: 'You both share early bird sleep schedules and value quiet study times.',
            highlights: ['Matching sleep schedule', 'Quiet study habit'],
            watch_out: '',
          },
        ],
      });

      const parsed = parseAndValidateLLMResponse(validText);
      expect(parsed.matches).toHaveLength(1);
      expect(parsed.matches[0].candidate_id).toBe(10);
      expect(parsed.matches[0].score).toBe(92);
      expect(parsed.matches[0].explanation).toBe(
        'You both share early bird sleep schedules and value quiet study times.'
      );
    });

    it('throws validation error if score is out of 0-100 range or matches exceeds 3', () => {
      const invalidScore = JSON.stringify({
        matches: [
          {
            candidate_id: 10,
            score: 150,
            explanation: 'Score is too high.',
            highlights: [],
            watch_out: '',
          },
        ],
      });
      expect(() => parseAndValidateLLMResponse(invalidScore)).toThrow();

      const tooManyMatches = JSON.stringify({
        matches: [
          { candidate_id: 1, score: 90, explanation: 'e1', highlights: [], watch_out: '' },
          { candidate_id: 2, score: 85, explanation: 'e2', highlights: [], watch_out: '' },
          { candidate_id: 3, score: 80, explanation: 'e3', highlights: [], watch_out: '' },
          { candidate_id: 4, score: 75, explanation: 'e4', highlights: [], watch_out: '' },
        ],
      });
      expect(() => parseAndValidateLLMResponse(tooManyMatches)).toThrow();
    });
  });

  describe('LLMService.rankMatches Unit Tests with Mock Provider', () => {
    class MockProvider extends BaseLLMProvider {
      constructor({ generateFn, retryFn }) {
        super();
        this.generateFn = generateFn;
        this.retryFn = retryFn;
        this.generateCalls = [];
        this.retryCalls = [];
      }

      async generate(params) {
        this.generateCalls.push(params);
        if (this.generateFn) return await this.generateFn(params);
        return {
          content: [{ type: 'text', text: '{"matches": []}' }],
        };
      }

      async retry(params) {
        this.retryCalls.push(params);
        if (this.retryFn) return await this.retryFn(params);
        return {
          content: [{ type: 'text', text: '{"matches": []}' }],
        };
      }
    }

    const testSeeker = {
      id: 1,
      age: 20,
      gender: 'male',
      city: 'Bhopal',
      college_name: 'MANIT',
    };

    const testRequirement = {
      city: 'Bhopal',
      budget_min: 5000,
      budget_max: 10000,
    };

    const testShortlist = [
      {
        candidate_id: 101,
        score: 90,
        compatibility_score: 90,
        user: { id: 101, full_name: 'User 101', age: 21, college_name: 'MANIT' },
        highlights: ['Pre highlight 1'],
        watch_out: '',
        explanation: 'Rule-based explanation 101',
      },
      {
        candidate_id: 102,
        score: 85,
        compatibility_score: 85,
        user: { id: 102, full_name: 'User 102', age: 22, college_name: 'MANIT' },
        highlights: ['Pre highlight 2'],
        watch_out: '',
        explanation: 'Rule-based explanation 102',
      },
      {
        candidate_id: 103,
        score: 80,
        compatibility_score: 80,
        user: { id: 103, full_name: 'User 103', age: 20, college_name: 'MANIT' },
        highlights: ['Pre highlight 3'],
        watch_out: '',
        explanation: 'Rule-based explanation 103',
      },
    ];

    it('skips call entirely when LLM_ENABLED=false and returns unavailable status', async () => {
      process.env.LLM_ENABLED = 'false';
      process.env.LLM_API_KEY = 'test_key';

      const mockProvider = new MockProvider({});
      const service = new LLMService(mockProvider);

      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(result.status).toBe('unavailable');
      expect(result.source).toBe('fallback');
      expect(result.matches).toHaveLength(0);
      expect(mockProvider.generateCalls).toHaveLength(0);
    });

    it('skips call entirely when LLM_API_KEY is empty and returns unavailable status', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = '';

      const mockProvider = new MockProvider({});
      const service = new LLMService(mockProvider);

      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(result.status).toBe('unavailable');
      expect(result.source).toBe('fallback');
      expect(mockProvider.generateCalls).toHaveLength(0);
    });

    it('handles valid LLM response and marks source as "llm"', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'valid_key';

      const mockProvider = new MockProvider({
        generateFn: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                matches: [
                  {
                    candidate_id: 101,
                    score: 95,
                    explanation: 'Excellent match with aligned study and sleep routines.',
                    highlights: ['Clean room', 'Quiet hours'],
                    watch_out: 'None',
                  },
                  {
                    candidate_id: 102,
                    score: 88,
                    explanation: 'Very compatible lifestyle with similar food preferences.',
                    highlights: ['Vegetarian', 'Non-smoker'],
                    watch_out: 'Occasional weekend guests',
                  },
                ],
              }),
            },
          ],
        }),
      });

      const service = new LLMService(mockProvider);
      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(result.status).toBe('success');
      expect(result.source).toBe('llm');
      expect(mockProvider.generateCalls).toHaveLength(1);
      expect(mockProvider.retryCalls).toHaveLength(0);

      // Check first match is from LLM
      expect(result.matches[0].candidate_id).toBe(101);
      expect(result.matches[0].score).toBe(95);
      expect(result.matches[0].explanation).toBe(
        'Excellent match with aligned study and sleep routines.'
      );
      expect(result.matches[0].source).toBe('llm');

      // Check second match is from LLM
      expect(result.matches[1].candidate_id).toBe(102);
      expect(result.matches[1].score).toBe(88);
      expect(result.matches[1].source).toBe('llm');

      // Check third match was filled from fallback candidates
      expect(result.matches[2].candidate_id).toBe(103);
      expect(result.matches[2].source).toBe('fallback');
    });

    it('discards hallucinated candidate_id and fills remaining slots from rule-based ranking', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'valid_key';

      const mockProvider = new MockProvider({
        generateFn: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                matches: [
                  {
                    candidate_id: 99999, // Hallucinated ID not in shortlist!
                    score: 99,
                    explanation: 'Invented candidate.',
                    highlights: [],
                    watch_out: '',
                  },
                  {
                    candidate_id: 102,
                    score: 91,
                    explanation: 'Genuine candidate from shortlist.',
                    highlights: ['Cleanliness'],
                    watch_out: '',
                  },
                ],
              }),
            },
          ],
        }),
      });

      const service = new LLMService(mockProvider);
      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(result.status).toBe('success');
      const ids = result.matches.map((m) => m.candidate_id);
      expect(ids).not.toContain(99999);
      expect(ids).toContain(102);

      // Candidate 102 is from LLM
      const match102 = result.matches.find((m) => m.candidate_id === 102);
      expect(match102.source).toBe('llm');

      // Remaining slots filled from shortlist (101 and 103) with source fallback
      expect(result.matches).toHaveLength(3);
      const fallbackMatches = result.matches.filter((m) => m.source === 'fallback');
      expect(fallbackMatches.map((m) => m.candidate_id)).toEqual([101, 103]);
    });

    it('triggers ONE retry on malformed JSON then falls back if retry also fails', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'valid_key';

      const mockProvider = new MockProvider({
        generateFn: async () => ({
          content: [
            {
              type: 'text',
              text: 'Not JSON at all: { broken json',
            },
          ],
        }),
        retryFn: async () => ({
          content: [
            {
              type: 'text',
              text: 'Still not valid JSON: {"matches": broken',
            },
          ],
        }),
      });

      const service = new LLMService(mockProvider);
      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(mockProvider.generateCalls).toHaveLength(1);
      expect(mockProvider.retryCalls).toHaveLength(1);
      expect(result.status).toBe('failed');
      expect(result.source).toBe('fallback');
      expect(result.matches).toHaveLength(0);
    });

    it('recovers successfully if retry produces valid JSON', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'valid_key';

      const mockProvider = new MockProvider({
        generateFn: async () => ({
          content: [{ type: 'text', text: 'Oops! Here is markdown ```json broken ```' }],
        }),
        retryFn: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                matches: [
                  {
                    candidate_id: 101,
                    score: 93,
                    explanation: 'Recovered after retry prompt.',
                    highlights: ['Synced schedule'],
                    watch_out: '',
                  },
                ],
              }),
            },
          ],
        }),
      });

      const service = new LLMService(mockProvider);
      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(mockProvider.generateCalls).toHaveLength(1);
      expect(mockProvider.retryCalls).toHaveLength(1);
      expect(result.status).toBe('success');
      expect(result.source).toBe('llm');
      expect(result.matches[0].candidate_id).toBe(101);
      expect(result.matches[0].score).toBe(93);
    });

    it('falls back on timeout or network error', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'valid_key';

      const mockProvider = new MockProvider({
        generateFn: async () => {
          throw new Error('LLM call timed out after 15 seconds');
        },
      });

      const service = new LLMService(mockProvider);
      const result = await service.rankMatches({
        seeker: testSeeker,
        requirement: testRequirement,
        shortlist: testShortlist,
      });

      expect(result.status).toBe('failed');
      expect(result.source).toBe('fallback');
      expect(result.matches).toHaveLength(0);
      expect(result.error).toContain('timed out');
    });

    it('safely logs errors without leaking API keys', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const apiKeySecret = 'sk-ant-api03-verysecretkey1234567890';
      process.env.LLM_API_KEY = apiKeySecret;

      const errorWithKey = new Error(`Authentication failed with key: ${apiKeySecret}`);
      safeLogError('Test error', errorWithKey);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0].join(' ');
      expect(loggedMessage).not.toContain(apiKeySecret);
      expect(loggedMessage).toContain('[REDACTED_API_KEY]');
      consoleSpy.mockRestore();
    });
  });

  describe('Integration with runMatching and match_results table', () => {
    async function createFixtureUser({
      email,
      gender = 'male',
      city = 'Bhopal',
      cleanliness = 4,
      sleep = 'early_bird',
      study = 'silent',
      noise = 'quiet',
      smoking = 'no',
      drinking = 'no',
      food = 'vegetarian',
      budget_min = 7000,
      budget_max = 12000,
      gender_pref = 'same_gender_only',
      clean_min = 3,
      smoking_ok = false,
      drinking_ok = false,
      sleep_pref = 'early_bird',
      food_pref = 'same_as_me',
    }) {
      const [userId] = await db('users').insert({
        email,
        password_hash: 'hashed_password_placeholder',
        email_verified: 1,
        role: 'student',
        status: 'active',
      });

      await db('profiles').insert({
        user_id: userId,
        full_name: 'Fixture Student',
        age: 21,
        gender,
        college_name: 'MANIT Bhopal',
        major: 'Computer Science',
        graduation_year: 2026,
        city,
        sleep_schedule: sleep,
        cleanliness_level: cleanliness,
        study_habits: study,
        noise_level: noise,
        smoking_preference: smoking,
        drinking_preference: drinking,
        food_preference: food,
        pet_preference: 'no_pets',
        guest_policy: 'rarely',
        bio: 'Looking for a peaceful roommate.',
        profile_completed: 1,
      });

      await db('requirements').insert({
        user_id: userId,
        city,
        budget_min,
        budget_max,
        gender_preference: gender_pref,
        preferred_sleep_schedule: sleep_pref,
        preferred_cleanliness_min: clean_min,
        smoking_ok: smoking_ok ? 1 : 0,
        drinking_ok: drinking_ok ? 1 : 0,
        food_preference: food_pref,
        guests_ok: 'sometimes',
        noise_tolerance: 'quiet',
        deal_breakers: null,
        importance_weights: JSON.stringify({ cleanliness: 2, sleep: 2 }),
        is_active: 1,
      });

      return userId;
    }

    beforeEach(async () => {
      await db('match_results').del();
      await db('blocks').del();
      await db('requirements').del();
      await db('profiles').del();
      await db('users').del();
    });

    it('stores source="fallback" in match_results when LLM is disabled', async () => {
      process.env.LLM_ENABLED = 'false';

      const requesterId = await createFixtureUser({ email: 'seeker@manit.ac.in' });
      await createFixtureUser({ email: 'c1@manit.ac.in' });
      await createFixtureUser({ email: 'c2@manit.ac.in' });
      await createFixtureUser({ email: 'c3@manit.ac.in' });

      const result = await runMatching(requesterId);
      expect(result.matches.length).toBeGreaterThanOrEqual(1);

      // Verify that match_results in DB has source='fallback'
      const rows = await db('match_results').where({ user_id: requesterId });
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.source).toBe('fallback');
      }
    });

    it('stores source="llm" in match_results when LLM ranking succeeds', async () => {
      process.env.LLM_ENABLED = 'true';
      process.env.LLM_API_KEY = 'mock_key';

      const requesterId = await createFixtureUser({ email: 'seeker2@manit.ac.in' });
      await createFixtureUser({ email: 'c1_2@manit.ac.in' });
      await createFixtureUser({ email: 'c2_2@manit.ac.in' });
      await createFixtureUser({ email: 'c3_2@manit.ac.in' });

      // Spy on LLMService.rankMatches
      const rankSpy = vi
        .spyOn(LLMService, 'rankMatches')
        .mockImplementation(async ({ shortlist }) => {
          const topCandidates = shortlist.slice(0, 3);
          return {
            status: 'success',
            source: 'llm',
            matches: topCandidates.map((c, i) => ({
              ...c,
              score: 95 - i * 2,
              compatibility_score: 95 - i * 2,
              explanation: `LLM-generated explanation for candidate ${c.candidate_id}`,
              highlights: ['AI Highlight 1', 'AI Highlight 2'],
              watch_out: i === 0 ? 'Potential morning routine clash' : '',
              source: 'llm',
            })),
          };
        });

      const result = await runMatching(requesterId);
      expect(rankSpy).toHaveBeenCalled();
      expect(result.matches[0].source).toBe('llm');
      expect(result.matches[0].explanation).toContain('LLM-generated explanation');

      // Verify DB storage has source = 'llm'
      const rows = await db('match_results').where({ user_id: requesterId });
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.source).toBe('llm');
        expect(row.ai_summary).toContain('LLM-generated explanation');
      }
    });
  });
});

