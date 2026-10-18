import matchingService from '../services/matching.service.js';

export async function getMatches(req, res, next) {
  try {
    const result = await matchingService.getCachedMatches(req.user.id);
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

export default {
  getMatches,
  refreshMatches,
};
