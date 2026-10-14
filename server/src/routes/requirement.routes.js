import { Router } from 'express';
import requirementController from '../controllers/requirement.controller.js';
import { authenticate, requireVerified, requireCompleteProfile } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { createRequirementSchema } from '../validations/requirement.validation.js';

const router = Router();

// Apply auth, verification, and profile completeness to all requirement routes
router.use(authenticate);
router.use(requireVerified);
router.use(requireCompleteProfile);

router.get('/active', requirementController.getActive);
router.post('/', validate(createRequirementSchema), requirementController.create);

export default router;
