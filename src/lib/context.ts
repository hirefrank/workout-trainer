import type { WorkerEnv } from "~/types/env";

/**
 * Get the Cloudflare environment from the async context
 */
export function getEnv(): WorkerEnv {
  // @ts-expect-error - Cloudflare Workers async context
  return globalThis[Symbol.for("cloudflare:env")];
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof WorkerEnv>(key: K): WorkerEnv[K] {
  const env = getEnv();
  return env[key];
}

/**
 * Get the KV namespace for workout completions
 */
export function getWorkoutsKV(): KVNamespace {
  return getEnvVar("WORKOUTS_KV");
}

/**
 * Get the current request from async context
 */
export function getRequest(): Request {
  // @ts-expect-error - Cloudflare Workers async context
  return globalThis[Symbol.for("cloudflare:request")];
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
