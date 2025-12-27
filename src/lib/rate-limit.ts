/**
 * Rate limiting utilities for Cloudflare Workers
 * Uses KV to track request counts per IP and endpoint
 */

import type { WorkerEnv } from "~/types/env";

const KV_MIN_TTL_SECONDS = 60;

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Default rate limit configurations by endpoint type
 */
export const RATE_LIMITS = {
  LOGIN: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;

/**
 * Check if request exceeds rate limit
 * Returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(
  request: Request,
  env: WorkerEnv,
  endpoint: string,
  config: RateLimitConfig,
): Promise<boolean> {
  // Get client IP from Cloudflare headers
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  // Create rate limit key: ratelimit:{ip}:{endpoint}
  const key = `ratelimit:${ip}:${endpoint}`;

  // Get current count
  const currentData = (await env.WORKOUTS_KV.get(key, "json")) as {
    count: number;
    resetAt: number;
  } | null;

  const now = Date.now();
  const windowEnd = now + config.windowMs;

  // If no data or window expired, start fresh
  if (!currentData || now > currentData.resetAt) {
    await env.WORKOUTS_KV.put(
      key,
      JSON.stringify({ count: 1, resetAt: windowEnd }),
      { expirationTtl: Math.ceil(config.windowMs / 1000) },
    );
    return false; // Not rate limited
  }

  // Increment count
  const newCount = currentData.count + 1;

  if (newCount > config.maxRequests) {
    return true; // Rate limit exceeded
  }

  const remainingTtl = Math.ceil((currentData.resetAt - now) / 1000);
  await env.WORKOUTS_KV.put(
    key,
    JSON.stringify({ count: newCount, resetAt: currentData.resetAt }),
    { expirationTtl: Math.max(KV_MIN_TTL_SECONDS, remainingTtl) },
  );

  return false; // Not rate limited
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(retryAfter: number = 60): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    },
  );
}
