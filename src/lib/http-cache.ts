export function getPrivateCacheHeaders(maxAgeSeconds: number = 60) {
  const staleWhileRevalidate = maxAgeSeconds * 5

  return {
    "Cache-Control": `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidate}`,
  }
}
