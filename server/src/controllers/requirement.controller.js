import requirementService from '../services/requirement.service.js';

export async function getActive(req, res, next) {
  try {
    const requirement = await requirementService.getActiveRequirement(req.user.id);
    res.status(200).json({ requirement });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const requirement = await requirementService.createRequirement(req.user.id, req.body);
    res.status(201).json({
      message: 'Requirement saved successfully.',
      requirement,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getActive,
  create,
};
