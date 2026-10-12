/**
 * Helper to extract human-readable error messages and codes from Axios errors or standard errors.
 */
export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred. Please try again.') {
  if (!error) return defaultMessage;
  if (typeof error === 'string') return error;

  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return defaultMessage;
}

export function getErrorCode(error) {
  return error?.response?.data?.error?.code || error?.code || null;
}
