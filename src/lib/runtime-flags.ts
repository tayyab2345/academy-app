function isEnabled(value: string | undefined) {
  if (!value) {
    return false
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

export function isDemoModeEnabled() {
  return isEnabled(process.env.DEMO_MODE)
}

export function shouldSkipSubdomainCheck() {
  return isDemoModeEnabled() || isEnabled(process.env.SKIP_SUBDOMAIN_CHECK)
}

export function isEmailVerificationRequired() {
  // TEMP: disable email verification for local/dev/demo until delivery is finalized.
  if (isDemoModeEnabled()) {
    return false
  }

  const configuredValue = process.env.EMAIL_VERIFICATION_REQUIRED

  if (configuredValue !== undefined) {
    return isEnabled(configuredValue)
  }

  return false
}
