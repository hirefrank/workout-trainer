import { getEvent } from "vinxi/http";
import type { WorkerEnv } from "~/types/env";

/**
 * Get the Cloudflare environment from the request context
 * Works in both dev (via @cloudflare/vite-plugin) and production (Cloudflare Workers)
 */
export function getEnv(): WorkerEnv {
  try {
    // Try vinxi/http event context (works with @cloudflare/vite-plugin)
    const event = getEvent();
    if (event?.context?.cloudflare?.env) {
      return event.context.cloudflare.env as WorkerEnv;
    }
  } catch {
    // Continue to next fallback
  }

  // Fallback to Cloudflare Workers async context (production)
  try {
    // @ts-expect-error - Cloudflare Workers async context
    const env = globalThis[Symbol.for("cloudflare:env")];
    if (env) return env;
  } catch {
    // Continue to error
  }

  throw new Error(
    "Cloudflare environment not available. " +
    "Make sure @cloudflare/vite-plugin is properly configured in vite.config.ts"
  );
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof WorkerEnv>(key: K): WorkerEnv[K] {
  const env = getEnv();
  const value = env[key];

  if (value === undefined) {
    throw new Error(
      `Environment variable ${String(key)} is not defined. ` +
      `Check wrangler.jsonc and .dev.vars configuration.`
    );
  }

  return value;
}

/**
 * Get the KV namespace for workout completions
 */
export function getWorkoutsKV(): KVNamespace {
  return getEnvVar("WORKOUTS_KV");
}

/**
 * Get the current request from context
 */
export function getRequest(): Request {
  try {
    // Try vinxi/http event first
    const event = getEvent();
    if (event?.node?.req) {
      return event.node.req as unknown as Request;
    }
  } catch {
    // Try Cloudflare Workers context
    try {
      // @ts-expect-error - Cloudflare Workers async context
      const request = globalThis[Symbol.for("cloudflare:request")];
      if (request) return request;
    } catch {
      // Continue
    }
  }

  throw new Error("Request not available in current context");
}

/**
 * Parse cookies from request headers
 */
export function getCookie(name: string): string | null {
  try {
    const request = getRequest();
    const cookieHeader = request.headers.get("Cookie");

    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));

    if (!cookie) {
      return null;
    }

    return cookie.substring(name.length + 1);
  } catch {
    return null;
  }
}

/**
 * Create a Set-Cookie header value for HttpOnly cookie
 */
export function createCookieHeader(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  } = {}
): string {
  const {
    maxAge = 60 * 60 * 24, // 24 hours default
    path = "/",
    secure = true,
    sameSite = "Lax",
  } = options;

  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
  ];

  if (secure) {
    parts.push("Secure");
  }

  parts.push(`SameSite=${sameSite}`);

  return parts.join("; ");
}

/**
 * Create a Set-Cookie header to delete a cookie
 */
export function deleteCookieHeader(name: string, path: string = "/"): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly`;
}
