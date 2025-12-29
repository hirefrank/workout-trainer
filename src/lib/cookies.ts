/**
 * Cookie utilities for vanilla Cloudflare Workers
 * Extracted from context.ts
 */

/**
 * Parse a specific cookie from request headers
 */
export function parseCookie(request: Request, name: string): string | null {
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
  } = {},
): string {
  const {
    maxAge = 60 * 60 * 24 * 30, // 30 days default
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
