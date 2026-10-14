import { z } from 'zod';

export const GENDER_PREFERENCE_OPTIONS = ['same_gender_only', 'any'];
export const PREFERRED_SLEEP_SCHEDULE_OPTIONS = ['same_as_me', 'any', 'early_bird', 'flexible', 'night_owl'];
export const FOOD_PREFERENCE_OPTIONS = ['any', 'same_as_me', 'vegetarian_only'];
export const GUESTS_OK_OPTIONS = ['rarely', 'sometimes', 'often'];
export const NOISE_TOLERANCE_OPTIONS = ['quiet', 'moderate', 'lively', 'any'];
export const IMPORTANCE_WEIGHT_KEYS = [
  'cleanliness',
  'sleep',
  'smoking',
  'drinking',
  'food',
  'guests',
  'noise',
  'social',
];

const importanceWeightsSchema = z
  .object({
    cleanliness: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    sleep: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    smoking: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    drinking: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    food: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    guests: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    noise: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
    social: z.number().int('Importance weight must be an integer').min(1).max(3).optional(),
  })
  .strict({
    message: `importance_weights keys are limited to: ${IMPORTANCE_WEIGHT_KEYS.join(', ')}`,
  })
  .optional()
  .nullable();

export const createRequirementSchema = z
  .object({
    city: z.string().trim().max(100).optional().nullable(),
    budget_min: z
      .coerce
      .number({ required_error: 'Minimum budget is required' })
      .int('Minimum budget must be an integer')
      .min(0, 'Minimum budget must be non-negative'),
    budget_max: z
      .coerce
      .number({ required_error: 'Maximum budget is required' })
      .int('Maximum budget must be an integer')
      .min(0, 'Maximum budget must be non-negative'),
    move_in_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Move-in date must be formatted as YYYY-MM-DD')
      .optional()
      .nullable()
      .or(z.literal('')),
    gender_preference: z.enum(GENDER_PREFERENCE_OPTIONS, {
      errorMap: () => ({
        message: `Gender preference must be one of: ${GENDER_PREFERENCE_OPTIONS.join(', ')}`,
      }),
    }),
    preferred_sleep_schedule: z
      .enum(PREFERRED_SLEEP_SCHEDULE_OPTIONS, {
        errorMap: () => ({
          message: `Preferred sleep schedule must be one of: ${PREFERRED_SLEEP_SCHEDULE_OPTIONS.join(', ')}`,
        }),
      })
      .default('any')
      .optional(),
    preferred_cleanliness_min: z
      .coerce
      .number()
      .int('Minimum cleanliness must be an integer')
      .min(1, 'Cleanliness must be between 1 and 5')
      .max(5, 'Cleanliness must be between 1 and 5')
      .default(1)
      .optional(),
    smoking_ok: z.boolean({
      required_error: 'Smoking preference is required',
    }),
    drinking_ok: z.boolean({
      required_error: 'Drinking preference is required',
    }),
    food_preference: z
      .enum(FOOD_PREFERENCE_OPTIONS, {
        errorMap: () => ({
          message: `Food preference must be one of: ${FOOD_PREFERENCE_OPTIONS.join(', ')}`,
        }),
      })
      .default('any')
      .optional(),
    guests_ok: z.enum(GUESTS_OK_OPTIONS, {
      errorMap: () => ({
        message: `Guests preference must be one of: ${GUESTS_OK_OPTIONS.join(', ')}`,
      }),
    }),
    noise_tolerance: z
      .enum(NOISE_TOLERANCE_OPTIONS, {
        errorMap: () => ({
          message: `Noise tolerance must be one of: ${NOISE_TOLERANCE_OPTIONS.join(', ')}`,
        }),
      })
      .default('any')
      .optional(),
    deal_breakers: z
      .string()
      .max(400, 'Deal-breakers cannot exceed 400 characters')
      .optional()
      .nullable(),
    importance_weights: importanceWeightsSchema,
  })
  .refine((data) => data.budget_max >= data.budget_min, {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['budget_max'],
  });

export default {
  createRequirementSchema,
  GENDER_PREFERENCE_OPTIONS,
  PREFERRED_SLEEP_SCHEDULE_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  GUESTS_OK_OPTIONS,
  NOISE_TOLERANCE_OPTIONS,
  IMPORTANCE_WEIGHT_KEYS,
};
