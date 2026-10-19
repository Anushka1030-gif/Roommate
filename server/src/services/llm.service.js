import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_FILE_PATH = path.resolve(__dirname, '../../prompts/matching.txt');

/**
 * Load system prompt from disk at runtime
 */
export function loadMatchingSystemPrompt() {
  return fs.readFileSync(PROMPT_FILE_PATH, 'utf8');
}

/**
 * Safe logging helper that avoids leaking the API key
 */
export function safeLogError(prefix, error) {
  let message = error?.message || String(error);
  // Redact potential API keys matching sk-ant-... or similar patterns
  message = message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]');
  if (config.llm?.apiKey) {
    message = message.replaceAll(config.llm.apiKey, '[REDACTED_API_KEY]');
  }
  if (process.env.LLM_API_KEY) {
    message = message.replaceAll(process.env.LLM_API_KEY, '[REDACTED_API_KEY]');
  }
  console.error(`${prefix}:`, message);
}

/**
 * Strip markdown code fences if present (e.g. ```json ... ```)
 */
export function stripMarkdownFences(text) {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = cleaned.match(fenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }
  return cleaned;
}

/**
 * Zod schema for single match item and LLM response
 */
export const llmMatchItemSchema = z.object({
  candidate_id: z.coerce.number().int(),
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
  highlights: z.array(z.string()).default([]),
  watch_out: z.string().default(''),
});

export const llmResponseSchema = z.object({
  matches: z.array(llmMatchItemSchema).max(3),
});

/**
 * Parse and validate raw LLM output text
 */
export function parseAndValidateLLMResponse(rawText) {
  const cleaned = stripMarkdownFences(rawText);
  const parsed = JSON.parse(cleaned);
  return llmResponseSchema.parse(parsed);
}

/**
 * Build compact JSON user message payload containing:
 * - Seeker profile & requirement (with importance weights & deal-breakers)
 * - Candidate shortlist (ONLY candidate_id, lifestyle, age, college_or_company, bio, pre_score)
 * NEVER contains email, phone, full name, or contact details.
 */
export function buildPromptPayload({ seeker, requirement, shortlist }) {
  const seekerProfile = {
    age: seeker?.age,
    gender: seeker?.gender,
    city: seeker?.city,
    college_or_company: seeker?.college_or_company || seeker?.college_name || '',
    bio: seeker?.bio || '',
    sleep_schedule: seeker?.sleep_schedule,
    cleanliness: seeker?.cleanliness_level ?? seeker?.cleanliness,
    noise_level: seeker?.noise_level,
    food_habit: seeker?.food_preference || seeker?.food_habit,
    smoking: seeker?.smoking_preference || seeker?.smoking,
    drinking: seeker?.drinking_preference || seeker?.drinking,
    study_habits: seeker?.study_habits || seeker?.study_work_routine,
    guest_policy: seeker?.guest_policy || seeker?.guests_frequency,
    social_style: seeker?.social_style || seeker?.pet_preference || '',
  };

  const seekerRequirement = {
    city: requirement?.city,
    budget_min: requirement?.budget_min,
    budget_max: requirement?.budget_max,
    gender_preference: requirement?.gender_preference,
    preferred_sleep_schedule: requirement?.preferred_sleep_schedule,
    preferred_cleanliness_min: requirement?.preferred_cleanliness_min,
    smoking_ok: Boolean(requirement?.smoking_ok),
    drinking_ok: Boolean(requirement?.drinking_ok),
    food_preference: requirement?.food_preference,
    guests_ok: requirement?.guests_ok,
    noise_tolerance: requirement?.noise_tolerance,
    deal_breakers: requirement?.deal_breakers || '',
    importance_weights: requirement?.importance_weights || {},
  };

  const candidateList = (shortlist || []).map((cand) => {
    const profile = cand.user || cand.profile || {};
    const candidateId = Number(
      cand.candidate_id ?? cand.id ?? cand.matched_user_id ?? profile.id ?? profile.user_id
    );

    return {
      candidate_id: candidateId,
      pre_score: Math.round(Number(cand.score ?? cand.compatibility_score ?? 0)),
      age: profile.age,
      college_or_company: profile.college_or_company || profile.college_name || '',
      bio: profile.bio || '',
      sleep_schedule: profile.sleep_schedule,
      cleanliness: profile.cleanliness_level ?? profile.cleanliness,
      noise_level: profile.noise_level,
      food_habit: profile.food_preference || profile.food_habit,
      smoking: profile.smoking_preference || profile.smoking,
      drinking: profile.drinking_preference || profile.drinking,
      study_habits: profile.study_habits || profile.study_work_routine,
      guest_policy: profile.guest_policy || profile.guests_frequency,
      social_style: profile.social_style || profile.pet_preference || '',
    };
  });

  return {
    seeker: {
      profile: seekerProfile,
      requirement: seekerRequirement,
    },
    shortlist: candidateList,
  };
}

/**
 * Base LLM Provider interface for pluggability
 */
export class BaseLLMProvider {
  async generate() {
    throw new Error('generate() must be implemented by LLM provider');
  }

  async retry() {
    throw new Error('retry() must be implemented by LLM provider');
  }
}

/**
 * Anthropic Claude Provider implementation
 */
export class AnthropicProvider extends BaseLLMProvider {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  async generate({ systemPrompt, userMessage, timeoutMs = 15000, signal }) {
    return await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { timeout: timeoutMs, signal }
    );
  }

  async retry({ systemPrompt, messages, timeoutMs = 15000, signal }) {
    return await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      },
      { timeout: timeoutMs, signal }
    );
  }
}

/**
 * Helper to check whether LLM is enabled and configured
 */
export function getLLMConfig() {
  const envEnabled = process.env.LLM_ENABLED;
  const configEnabled = config.llm?.enabled;
  const isEnabled = envEnabled !== undefined ? envEnabled === 'true' : Boolean(configEnabled);

  const envApiKey = process.env.LLM_API_KEY;
  const apiKey = (envApiKey !== undefined ? envApiKey : config.llm?.apiKey || '').trim();
  const model = process.env.LLM_MODEL || config.llm?.model || 'claude-3-5-sonnet-20241022';
  const provider = process.env.LLM_PROVIDER || config.llm?.provider || 'anthropic';

  return {
    available: isEnabled && Boolean(apiKey),
    apiKey,
    model,
    provider,
  };
}

/**
 * LLM Service class exposing rankMatches({ seeker, requirement, shortlist })
 */
export class LLMService {
  constructor(provider = null) {
    this.provider = provider;
  }

  getProvider() {
    if (this.provider) return this.provider;
    const { apiKey, model } = getLLMConfig();
    return new AnthropicProvider(apiKey, model);
  }

  /**
   * Main matching ranking method.
   *
   * @param {object} params - { seeker, requirement, shortlist }
   * @returns {Promise<object>} { status, source, matches, [reason] }
   */
  async rankMatches({ seeker, requirement, shortlist = [] }) {
    const llmConfig = getLLMConfig();

    // 1. Immediately signal unavailable if disabled or key missing
    if (!llmConfig.available) {
      return {
        status: 'unavailable',
        source: 'fallback',
        matches: [],
        reason: 'LLM_DISABLED_OR_KEY_MISSING',
      };
    }

    if (!shortlist || shortlist.length === 0) {
      return {
        status: 'success',
        source: 'llm',
        matches: [],
      };
    }

    const systemPrompt = loadMatchingSystemPrompt();
    const payload = buildPromptPayload({ seeker, requirement, shortlist });
    const userMessage = JSON.stringify(payload);

    const provider = this.getProvider();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error('LLM call timed out after 15 seconds'));
    }, 15000);

    let rawText = '';
    let parsedResponse = null;

    try {
      // First attempt
      const response = await provider.generate({
        systemPrompt,
        userMessage,
        timeoutMs: 15000,
        signal: controller.signal,
      });

      const textBlock = response?.content?.find((block) => block.type === 'text');
      rawText = textBlock ? textBlock.text : '';

      try {
        parsedResponse = parseAndValidateLLMResponse(rawText);
      } catch (parseErr) {
        // Retry ONCE with corrective instruction
        safeLogError('LLM initial response invalid, retrying once', parseErr);

        const correctiveInstruction =
          'Your previous response was not valid JSON conforming to the requested schema. Return ONLY valid JSON with no markdown formatting or extra text, matching the exact shape: {"matches": [{"candidate_id": <number>, "score": <0-100>, "explanation": "<string>", "highlights": ["<string>"], "watch_out": "<string>"}]}';

        const retryMessages = [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: rawText },
          { role: 'user', content: correctiveInstruction },
        ];

        const retryResponse = await provider.retry({
          systemPrompt,
          messages: retryMessages,
          timeoutMs: 15000,
          signal: controller.signal,
        });

        const retryTextBlock = retryResponse?.content?.find((block) => block.type === 'text');
        const retryRawText = retryTextBlock ? retryTextBlock.text : '';
        parsedResponse = parseAndValidateLLMResponse(retryRawText);
      }
    } catch (err) {
      safeLogError('LLM matching call failed', err);
      return {
        status: 'failed',
        source: 'fallback',
        matches: [],
        error: err.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // 2. Discard any entry whose candidate_id is not in the shortlist
    const shortlistMap = new Map();
    for (const cand of shortlist) {
      const cid = Number(
        cand.candidate_id ?? cand.id ?? cand.matched_user_id ?? cand.user?.id ?? cand.profile?.id
      );
      shortlistMap.set(cid, cand);
    }

    const seenIds = new Set();
    const finalMatches = [];

    for (const match of parsedResponse.matches) {
      const cid = Number(match.candidate_id);
      if (shortlistMap.has(cid) && !seenIds.has(cid)) {
        seenIds.add(cid);
        const originalCand = shortlistMap.get(cid);

        finalMatches.push({
          candidate_id: cid,
          score: match.score,
          compatibility_score: match.score,
          user: originalCand.user || originalCand.profile,
          requirement: originalCand.requirement,
          score_breakdown: originalCand.score_breakdown || {},
          highlights: match.highlights,
          watch_out: match.watch_out || '',
          explanation: match.explanation,
          icebreakers: originalCand.icebreakers || [],
          status: 'suggested',
          source: 'llm',
        });
      }
    }

    // 3. Fill remaining slots from rule-based ranking up to max 3
    const maxSlots = Math.min(3, shortlist.length);
    for (const cand of shortlist) {
      if (finalMatches.length >= maxSlots) break;
      const cid = Number(
        cand.candidate_id ?? cand.id ?? cand.matched_user_id ?? cand.user?.id ?? cand.profile?.id
      );
      if (!seenIds.has(cid)) {
        seenIds.add(cid);
        finalMatches.push({
          ...cand,
          candidate_id: cid,
          compatibility_score: cand.score ?? cand.compatibility_score,
          source: 'fallback',
        });
      }
    }

    const hasLLMMatches = finalMatches.some((m) => m.source === 'llm');

    return {
      status: 'success',
      source: hasLLMMatches ? 'llm' : 'fallback',
      matches: finalMatches,
    };
  }

  /**
   * Static alias for convenience
   */
  static async rankMatches(params) {
    return await defaultLLMService.rankMatches(params);
  }
}

export const defaultLLMService = new LLMService();

export default LLMService;
