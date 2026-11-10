/**
 * Minimal in-memory fixed-window rate limiter. Scoped to a single server
 * instance (state lives in this module's memory) — enough to blunt scripted
 * abuse of the server actions on a single-node deployment. For a multi-instance
 * deployment, back this with a shared store (e.g. Redis) instead.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Returns true if the call is allowed, false if the key is over its limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
