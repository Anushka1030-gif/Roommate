import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const firstIssue = err.issues[0];
      const code = firstIssue?.params?.code || 'VALIDATION_ERROR';
      return res.status(400).json({
        error: {
          code,
          message: firstIssue?.message || 'Invalid request parameters',
        },
      });
    }
    next(err);
  }
};

export default validate;
