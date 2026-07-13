// Supabase returns terse, sometimes technical error strings — translate the
// common ones into language a restaurant/hotel owner would understand.
export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before logging in — check your inbox for the confirmation link.'
  }
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists.'
  }
  if (
    normalized.includes('rate') ||
    normalized.includes('too many') ||
    normalized.includes('security') ||
    normalized.includes('wait')
  ) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (normalized.includes('network')) {
    return 'Network error. Check your connection and try again.'
  }

  return message || 'Something went wrong. Please try again.'
}
