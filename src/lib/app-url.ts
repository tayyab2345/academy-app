export function getAppBaseUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim()

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "")
  }

  const netlifyUrl = process.env.URL?.trim()

  if (netlifyUrl) {
    return netlifyUrl.replace(/\/+$/, "")
  }

  const deployPrimeUrl = process.env.DEPLOY_PRIME_URL?.trim()

  if (deployPrimeUrl) {
    return deployPrimeUrl.replace(/\/+$/, "")
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()

  if (vercelUrl) {
    const protocol = vercelUrl.startsWith("http") ? "" : "https://"
    return `${protocol}${vercelUrl}`.replace(/\/+$/, "")
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
