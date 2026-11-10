import blockService from '../services/block.service.js';

export async function blockUser(req, res, next) {
  try {
    const { blocked_user_id, reason } = req.body;
    const result = await blockService.blockUser(req.user.id, blocked_user_id, reason);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await blockService.unblockUser(req.user.id, userId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBlockedUsers(req, res, next) {
  try {
    const blockedUsers = await blockService.getBlockedUsers(req.user.id);
    return res.status(200).json({
      success: true,
      blocks: blockedUsers,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  blockUser,
  unblockUser,
  getBlockedUsers,
};

