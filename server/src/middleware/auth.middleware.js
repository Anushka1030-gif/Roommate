import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../db/index.js';

export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.token;

    // Optional fallback to Authorization header if cookie is absent
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or has expired.',
        },
      });
    }

    // Query user and their profile full_name from database
    const user = await db('users')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .where('users.id', decoded.id)
      .select(
        'users.id',
        'users.email',
        'users.role',
        'users.email_verified',
        'users.status',
        'profiles.full_name'
      )
      .first();

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found.',
        },
      });
    }

    // Reject suspended users on every request
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: {
          code: 'USER_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.',
        },
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        error: {
          code: 'USER_BANNED',
          message: 'Your account has been banned.',
        },
      });
    }

    req.user = {
      ...user,
      email_verified: Boolean(user.email_verified),
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireVerified(req, res, next) {
  if (!req.user || !req.user.email_verified) {
    return res.status(403).json({
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification is required to access this resource.',
      },
    });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required.',
      },
    });
  }
  next();
}

export default {
  authenticate,
  requireVerified,
  requireAdmin,
};
