const NETWORK_ERROR_MESSAGE =
  'Unable to reach server. Please check your internet and try again.';

export const safeErrorMessage = (
  error: any,
  fallback = 'Something went wrong. Please try again.',
) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');

  if (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    message === 'Network Error' ||
    message.toLowerCase().includes('timeout')
  ) {
    return NETWORK_ERROR_MESSAGE;
  }

  return fallback;
};

export const safeAuthErrorMessage = (error: any, fallback: string) => {
  const code = String(error?.code || '');

  if (code === 'auth/invalid-phone-number') {
    return 'Invalid phone number format';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many requests. Please try again later';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'Invalid OTP. Please check and try again.';
  }
  if (code === 'auth/session-expired') {
    return 'OTP expired. Please request a new one.';
  }

  return fallback;
};
