import db from '../db/index.js';

export const REQUIRED_PROFILE_FIELDS = [
  'full_name',
  'age',
  'gender',
  'college_name',
  'major',
  'graduation_year',
  'city',
  'sleep_schedule',
  'cleanliness_level',
  'study_habits',
  'noise_level',
  'smoking_preference',
  'drinking_preference',
  'food_preference',
  'pet_preference',
  'guest_policy',
];

export function computeProfileCompleteness(profile) {
  if (!profile) {
    return {
      profile_complete: false,
      completeness_percentage: 0,
    };
  }

  const filledCount = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const val = profile[field];
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
  }).length;

  const total = REQUIRED_PROFILE_FIELDS.length;
  const completeness_percentage = Math.round((filledCount / total) * 100);
  const profile_complete = filledCount === total;

  return {
    profile_complete,
    completeness_percentage,
  };
}

export function sanitizeProfile(profile) {
  if (!profile) return null;
  const sanitized = { ...profile };
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.password_hash;
  return sanitized;
}

export async function getProfileByUserId(userId) {
  let profile = await db('profiles').where({ user_id: userId }).first();

  if (!profile) {
    // If no profile exists yet, create an initial stub
    const user = await db('users').where({ id: userId }).first();
    const [createdId] = await db('profiles').insert({
      user_id: userId,
      full_name: user?.full_name || '',
      profile_completed: false,
    });
    profile = await db('profiles').where({ id: createdId }).first();
  }

  const { profile_complete, completeness_percentage } = computeProfileCompleteness(profile);

  // Sync profile_completed column if changed
  if (Boolean(profile.profile_completed) !== profile_complete) {
    await db('profiles').where({ id: profile.id }).update({ profile_completed: profile_complete });
    profile.profile_completed = profile_complete;
  }

  return {
    profile: sanitizeProfile(profile),
    profile_complete,
    completeness_percentage,
  };
}

export async function upsertProfile(userId, data) {
  const allowedProfileFields = [
    'full_name',
    'age',
    'gender',
    'college_name',
    'major',
    'graduation_year',
    'city',
    'sleep_schedule',
    'cleanliness_level',
    'study_habits',
    'noise_level',
    'smoking_preference',
    'drinking_preference',
    'food_preference',
    'pet_preference',
    'guest_policy',
    'bio',
    'avatar_url',
  ];

  const updatePayload = {};
  for (const field of allowedProfileFields) {
    if (data[field] !== undefined) {
      updatePayload[field] = data[field];
    }
  }

  // Handle phone if explicitly provided
  if (data.phone !== undefined) {
    const formattedPhone = data.phone ? data.phone.trim() : null;
    await db('users').where({ id: userId }).update({ phone: formattedPhone });
    updatePayload.phone = formattedPhone;
  }

  const existingProfile = await db('profiles').where({ user_id: userId }).first();

  if (existingProfile) {
    if (Object.keys(updatePayload).length > 0) {
      await db('profiles').where({ user_id: userId }).update(updatePayload);
    }
  } else {
    await db('profiles').insert({
      user_id: userId,
      full_name: data.full_name || '',
      ...updatePayload,
    });
  }

  const updatedProfile = await db('profiles').where({ user_id: userId }).first();
  const { profile_complete, completeness_percentage } = computeProfileCompleteness(updatedProfile);

  // Keep profile_completed column in sync
  await db('profiles').where({ user_id: userId }).update({ profile_completed: profile_complete });
  updatedProfile.profile_completed = profile_complete;

  return {
    profile: sanitizeProfile(updatedProfile),
    profile_complete,
    completeness_percentage,
  };
}

export async function updateUserPhone(userId, phone) {
  const formattedPhone = phone ? phone.trim() : null;

  await db('users').where({ id: userId }).update({ phone: formattedPhone });

  const existingProfile = await db('profiles').where({ user_id: userId }).first();
  if (existingProfile) {
    await db('profiles').where({ user_id: userId }).update({ phone: formattedPhone });
  }

  return { success: true };
}

export default {
  REQUIRED_PROFILE_FIELDS,
  computeProfileCompleteness,
  sanitizeProfile,
  getProfileByUserId,
  upsertProfile,
  updateUserPhone,
};
