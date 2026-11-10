import { ZodError } from 'zod';

export const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const dataToValidate = req[source] || {};
    const parsed = schema.parse(dataToValidate);
    req[source] = parsed;
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
