import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const createLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.nodeEnv === 'test',
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: options.code || 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.',
        },
      });
    },
    ...options,
  });
};

export const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts. Please try again in 15 minutes.',
});

export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const verifyOtpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many OTP verification attempts. Please try again later.',
});

export const resendOtpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP resend requests. Please try again in 15 minutes.',
});

export const matchesRefreshLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  code: 'MATCH_REFRESH_LIMIT_EXCEEDED',
  message: 'Daily match refresh limit reached (maximum 5 refreshes per day). Please try again tomorrow.',
  keyGenerator: (req) => (req.user ? String(req.user.id) : req.ip),
});

export const messageSendLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
  message: 'You are sending messages too quickly. Please slow down.',
  keyGenerator: (req) => (req.user ? String(req.user.id) : req.ip),
});


