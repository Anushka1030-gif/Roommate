import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config, { BLOCKED_EMAIL_DOMAINS } from '../config/index.js';
import mailService from './mail.service.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '../utils/errors.js';

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.full_name || '',
    email: user.email,
    email_verified: Boolean(user.email_verified),
    role: user.role,
    status: user.status,
    profile_completed: Boolean(user.profile_completed),
  };
}

export async function getUserWithProfileById(userId) {
  return db('users')
    .leftJoin('profiles', 'users.id', 'profiles.user_id')
    .where('users.id', userId)
    .select(
      'users.id',
      'users.email',
      'users.role',
      'users.email_verified',
      'users.status',
      'profiles.full_name',
      'profiles.profile_completed'
    )
    .first();
}

export async function getUserWithProfileByEmail(email) {
  return db('users')
    .leftJoin('profiles', 'users.id', 'profiles.user_id')
    .where('users.email', email)
    .select(
      'users.id',
      'users.email',
      'users.role',
      'users.email_verified',
      'users.status',
      'profiles.full_name',
      'profiles.profile_completed'
    )
    .first();
}

export async function register({ full_name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];

  // 1. Enforce blocked domains rule
  if (domain && BLOCKED_EMAIL_DOMAINS.includes(domain)) {
    throw new BadRequestError(
      `Public email providers (${domain}) are not permitted. Please use your official college or university email address.`,
      'EMAIL_DOMAIN_NOT_ALLOWED'
    );
  }

  // 2. Enforce duplicate email check
  const existingUser = await db('users').where({ email: normalizedEmail }).first();
  if (existingUser) {
    throw new ConflictError('An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Create user and base profile in transaction
  let newUserId;
  await db.transaction(async (trx) => {
    const [userId] = await trx('users').insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'student',
      email_verified: false,
      status: 'active',
    });

    newUserId = userId;

    await trx('profiles').insert({
      user_id: userId,
      full_name: full_name.trim(),
      profile_completed: false,
    });
  });

  // 5. Generate 6-digit OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHashed = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any previous unconsumed OTPs
  await db('email_otps')
    .where({ email: normalizedEmail, type: 'registration', consumed_at: null })
    .update({ consumed_at: db.fn.now() });

  // Store hashed OTP
  await db('email_otps').insert({
    email: normalizedEmail,
    otp_code: otpHashed,
    type: 'registration',
    attempts: 0,
    expires_at: expiresAt,
  });

  // 6. Send OTP via email (or dev log)
  await mailService.sendOtpEmail({
    to: normalizedEmail,
    otp: rawOtp,
    type: 'registration',
  });

  return {
    message: 'Registration successful. A 6-digit verification code has been sent to your email.',
    userId: newUserId,
    email: normalizedEmail,
  };
}

export async function verifyOtp({ email, otp }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find latest unconsumed OTP record
  const record = await db('email_otps')
    .where({ email: normalizedEmail, type: 'registration', consumed_at: null })
    .orderBy('created_at', 'desc')
    .first();

  if (!record) {
    throw new BadRequestError(
      'No active verification code found for this email. Please request a new one.',
      'OTP_NOT_FOUND'
    );
  }

  // Check attempt limit (max 5)
  if (record.attempts >= 5) {
    throw new BadRequestError(
      'Maximum verification attempts exceeded. Please request a new OTP.',
      'OTP_MAX_ATTEMPTS_EXCEEDED'
    );
  }

  // Check expiry (10 minutes)
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new BadRequestError('OTP has expired. Please request a new OTP.', 'OTP_EXPIRED');
  }

  // Check code validity against hash
  const isMatch = await bcrypt.compare(otp, record.otp_code);

  if (!isMatch) {
    const updatedAttempts = record.attempts + 1;
    await db('email_otps').where({ id: record.id }).update({ attempts: updatedAttempts });

    if (updatedAttempts >= 5) {
      throw new BadRequestError(
        'Maximum verification attempts exceeded. Please request a new OTP.',
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    throw new BadRequestError(
      `Invalid verification code. ${5 - updatedAttempts} attempt(s) remaining.`,
      'INVALID_OTP'
    );
  }

  // Success: mark OTP consumed
  await db('email_otps').where({ id: record.id }).update({ consumed_at: db.fn.now() });

  // Update user email_verified = true
  await db('users').where({ email: normalizedEmail }).update({ email_verified: true });

  const updatedUser = await getUserWithProfileByEmail(normalizedEmail);

  return {
    message: 'Email verified successfully.',
    user: sanitizeUser(updatedUser),
  };
}

export async function resendOtp({ email }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db('users').where({ email: normalizedEmail }).first();
  if (!user) {
    throw new NotFoundError('User account not found.', 'USER_NOT_FOUND');
  }

  if (user.email_verified) {
    throw new BadRequestError('Email address is already verified.', 'EMAIL_ALREADY_VERIFIED');
  }

  // 60-second cooldown check
  const latestOtp = await db('email_otps')
    .where({ email: normalizedEmail, type: 'registration' })
    .orderBy('created_at', 'desc')
    .first();

  if (latestOtp) {
    const elapsedMs = Date.now() - new Date(latestOtp.created_at).getTime();
    const cooldownMs = 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw new TooManyRequestsError(
        `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        'OTP_COOLDOWN_ACTIVE'
      );
    }
  }

  // Invalidate previous unconsumed OTPs
  await db('email_otps')
    .where({ email: normalizedEmail, type: 'registration', consumed_at: null })
    .update({ consumed_at: db.fn.now() });

  // Generate new OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHashed = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db('email_otps').insert({
    email: normalizedEmail,
    otp_code: otpHashed,
    type: 'registration',
    attempts: 0,
    expires_at: expiresAt,
  });

  await mailService.sendOtpEmail({
    to: normalizedEmail,
    otp: rawOtp,
    type: 'registration',
  });

  return {
    message: 'A new verification OTP has been sent to your email.',
  };
}

export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db('users').where({ email: normalizedEmail }).first();
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  // Reject suspended users
  if (user.status === 'suspended') {
    throw new ForbiddenError(
      'Your account has been suspended. Please contact support.',
      'USER_SUSPENDED'
    );
  }

  if (user.status === 'banned') {
    throw new ForbiddenError('Your account has been banned.', 'USER_BANNED');
  }

  // Unverified users are allowed to log in, with email_verified=false in user payload
  const fullUser = await getUserWithProfileByEmail(normalizedEmail);

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );

  return {
    token,
    user: sanitizeUser(fullUser),
  };
}

export default {
  register,
  verifyOtp,
  resendOtp,
  login,
  sanitizeUser,
  getUserWithProfileById,
  getUserWithProfileByEmail,
};
