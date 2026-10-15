import 'server-only'

const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 3
const MAX_TRACKED_KEYS = 10_000

interface RateLimitEntry {
  count: number
  resetAt: number
}

const entries = new Map<string, RateLimitEntry>()

function removeExpiredEntries(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key)
  }
}

export function takeCommentRateLimit(key: string) {
  const now = Date.now()
  removeExpiredEntries(now)

  if (entries.size >= MAX_TRACKED_KEYS && !entries.has(key)) {
    return { allowed: false, retryAfterSeconds: 60 }
  }

  const current = entries.get(key)
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}
