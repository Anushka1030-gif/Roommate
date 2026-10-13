import profileService from '../services/profile.service.js';

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

export default {
  updatePhone,
};
