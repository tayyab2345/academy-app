function normalizeAppUrl(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const protocol = /^https?:\/\//i.test(trimmed) ? "" : "https://"
  return `${protocol}${trimmed}`.replace(/\/+$/, "")
}

export function getAppBaseUrl() {
  const configuredUrl = normalizeAppUrl(process.env.NEXTAUTH_URL)

  if (configuredUrl) {
    return configuredUrl
  }

  const netlifyUrl = normalizeAppUrl(process.env.URL)

  if (netlifyUrl) {
    return netlifyUrl
  }

  const deployPrimeUrl = normalizeAppUrl(process.env.DEPLOY_PRIME_URL)

  if (deployPrimeUrl) {
    return deployPrimeUrl
  }

  const vercelUrl = normalizeAppUrl(process.env.VERCEL_URL)

  if (vercelUrl) {
    return vercelUrl
  }

  const railwayUrl = normalizeAppUrl(process.env.RAILWAY_PUBLIC_DOMAIN)

  if (railwayUrl) {
    return railwayUrl
  }

  return "http://localhost:3000"
}

export function getAbsoluteAppUrl(pathname: string) {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${getAppBaseUrl()}${normalizedPath}`
}
