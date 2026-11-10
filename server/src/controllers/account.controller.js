import profileService from '../services/profile.service.js';
import accountService from '../services/account.service.js';

export async function updatePhone(req, res, next) {
  try {
    await profileService.updateUserPhone(req.user.id, req.body.phone);
    res.status(200).json({
      message: 'Phone number updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await accountService.changePassword(req.user.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const result = await accountService.deleteAccount(req.user.id, req.body);
    // Clear JWT authentication cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  updatePhone,
  changePassword,
  deleteAccount,
};
