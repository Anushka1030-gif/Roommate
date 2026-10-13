import profileService from '../services/profile.service.js';

export async function getMe(req, res, next) {
  try {
    const result = await profileService.getProfileByUserId(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const result = await profileService.upsertProfile(req.user.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  getMe,
  updateMe,
};
