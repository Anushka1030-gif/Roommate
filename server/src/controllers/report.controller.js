import reportService from '../services/report.service.js';

export async function createReport(req, res, next) {
  try {
    const { reported_user_id, reason, details } = req.body;
    const result = await reportService.createReport(req.user.id, reported_user_id, reason, details);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  createReport,
};

