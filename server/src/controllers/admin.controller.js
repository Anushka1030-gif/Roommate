import adminService from '../services/admin.service.js';

export async function getReports(req, res, next) {
  try {
    const status = req.query.status || 'open';
    const reports = await adminService.getReports(status);
    return res.status(200).json({
      success: true,
      reports,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchReport(req, res, next) {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    const result = await adminService.handleReportAction(req.user.id, id, action, note);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await adminService.getStats();
    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getReports,
  patchReport,
  getStats,
};

