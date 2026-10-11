import config from '../config/index.js';
import authService, { sanitizeUser } from '../services/auth.service.js';

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      message: result.message,
      email: result.email,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const result = await authService.resendOtp(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);

    const isProduction = config.nodeEnv === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Login successful.',
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  const isProduction = config.nodeEnv === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  });

  res.status(200).json({
    message: 'Logged out successfully.',
  });
}

export async function getMe(req, res) {
  res.status(200).json({
    user: sanitizeUser(req.user),
  });
}

export default {
  register,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getMe,
};
