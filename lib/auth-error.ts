export function normalizeAuthError(msg: string): { message: string; retryAfterSeconds?: number } {
  const lower = msg.toLowerCase();

  const secMatch = lower.match(/after\s+(\d+)\s+second/);
  const secs = secMatch ? parseInt(secMatch[1], 10) : undefined;

  if (
    lower.includes('security purposes') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    (lower.includes('only request') && lower.includes('second'))
  ) {
    return {
      message: secs
        ? `Please wait ${secs} seconds before trying again.`
        : 'Please wait a few seconds before trying again.',
      retryAfterSeconds: secs,
    };
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return { message: 'Email or password is incorrect.' };
  }
  if (lower.includes('email not confirmed')) {
    return { message: 'Please confirm your email before logging in.' };
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already registered')
  ) {
    return { message: 'An account with this email already exists. Try logging in instead.' };
  }
  if (lower.includes('database error')) {
    return { message: 'We could not create your account right now. Please try again in a moment.' };
  }
  return { message: msg };
}
