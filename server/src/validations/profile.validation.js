import { z } from 'zod';
import { SUPPORTED_CITIES } from '../config/index.js';

export const GENDER_OPTIONS = ['male', 'female', 'non-binary', 'other'];
export const SLEEP_SCHEDULE_OPTIONS = ['early_bird', 'night_owl', 'flexible'];
export const STUDY_HABITS_OPTIONS = ['silent', 'background_noise', 'group_study', 'flexible'];
export const NOISE_LEVEL_OPTIONS = ['quiet', 'moderate', 'social'];
export const SMOKING_PREFERENCE_OPTIONS = ['no', 'outside_only', 'yes', 'flexible'];
export const DRINKING_PREFERENCE_OPTIONS = ['no', 'socially', 'yes', 'flexible'];
export const FOOD_PREFERENCE_OPTIONS = ['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian', 'any'];
export const PET_PREFERENCE_OPTIONS = ['no_pets', 'dog_friendly', 'cat_friendly', 'flexible'];
export const GUEST_POLICY_OPTIONS = ['rarely', 'weekends_only', 'anytime', 'no_guests'];

export const putProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .optional(),
  age: z
    .coerce
    .number()
    .int('Age must be an integer')
    .min(17, 'Age must be between 17 and 40')
    .max(40, 'Age must be between 17 and 40')
    .optional()
    .nullable(),
  gender: z
    .enum(GENDER_OPTIONS, {
      errorMap: () => ({ message: `Gender must be one of: ${GENDER_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  college_name: z
    .string()
    .trim()
    .min(2, 'College name must be at least 2 characters')
    .max(150, 'College name cannot exceed 150 characters')
    .optional()
    .nullable(),
  major: z
    .string()
    .trim()
    .min(2, 'Major must be at least 2 characters')
    .max(100, 'Major cannot exceed 100 characters')
    .optional()
    .nullable(),
  graduation_year: z
    .coerce
    .number()
    .int('Graduation year must be an integer')
    .min(2020, 'Graduation year must be between 2020 and 2040')
    .max(2040, 'Graduation year must be between 2020 and 2040')
    .optional()
    .nullable(),
  city: z
    .string()
    .trim()
    .refine((val) => !val || SUPPORTED_CITIES.includes(val), {
      message: `City must be one of: ${SUPPORTED_CITIES.join(', ')}`,
    })
    .optional()
    .nullable(),
  sleep_schedule: z
    .enum(SLEEP_SCHEDULE_OPTIONS, {
      errorMap: () => ({ message: `Sleep schedule must be one of: ${SLEEP_SCHEDULE_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  cleanliness_level: z
    .coerce
    .number()
    .int('Cleanliness level must be an integer')
    .min(1, 'Cleanliness must be between 1 and 5')
    .max(5, 'Cleanliness must be between 1 and 5')
    .optional()
    .nullable(),
  study_habits: z
    .enum(STUDY_HABITS_OPTIONS, {
      errorMap: () => ({ message: `Study habits must be one of: ${STUDY_HABITS_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  noise_level: z
    .enum(NOISE_LEVEL_OPTIONS, {
      errorMap: () => ({ message: `Noise level must be one of: ${NOISE_LEVEL_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  smoking_preference: z
    .enum(SMOKING_PREFERENCE_OPTIONS, {
      errorMap: () => ({ message: `Smoking preference must be one of: ${SMOKING_PREFERENCE_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  drinking_preference: z
    .enum(DRINKING_PREFERENCE_OPTIONS, {
      errorMap: () => ({ message: `Drinking preference must be one of: ${DRINKING_PREFERENCE_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  food_preference: z
    .enum(FOOD_PREFERENCE_OPTIONS, {
      errorMap: () => ({ message: `Food preference must be one of: ${FOOD_PREFERENCE_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  pet_preference: z
    .enum(PET_PREFERENCE_OPTIONS, {
      errorMap: () => ({ message: `Pet preference must be one of: ${PET_PREFERENCE_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  guest_policy: z
    .enum(GUEST_POLICY_OPTIONS, {
      errorMap: () => ({ message: `Guest policy must be one of: ${GUEST_POLICY_OPTIONS.join(', ')}` }),
    })
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(600, 'Bio cannot exceed 600 characters')
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .max(500, 'Avatar URL cannot exceed 500 characters')
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{1,4}[\s-]?)?([0-9]{10,14})$/, 'Invalid phone number format')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const updatePhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{1,4}[\s-]?)?([0-9]{10,14})$/, 'Invalid phone number format. Please provide a valid 10-14 digit phone number.')
    .optional()
    .nullable()
    .or(z.literal('')),
});
