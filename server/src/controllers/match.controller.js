import matchingService from '../services/matching.service.js';

export async function getMatches(req, res, next) {
  try {
    const status = req.query.status || null;
    const result = await matchingService.getCachedMatches(req.user.id, status);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshMatches(req, res, next) {
  try {
    const result = await matchingService.refreshMatches(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMatchStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['suggested', 'liked', 'skipped', 'connected'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: suggested, liked, skipped, connected',
        },
      });
    }

    const updated = await matchingService.updateMatchStatus(req.user.id, id, status);
    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'MATCH_NOT_FOUND',
          message: 'Match result not found',
        },
      });
    }

    return res.status(200).json({
      success: true,
      match_id: updated.id,
      candidate_id: updated.matched_user_id,
      status: updated.status,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getMatches,
  refreshMatches,
  updateMatchStatus,
};
