/**
 * Security headers middleware for Cloudflare Workers
 * Adds defense-in-depth protection against common web attacks
 */

export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableFrameProtection?: boolean;
  enableMimeSniffing?: boolean;
}

const defaultConfig: SecurityHeadersConfig = {
  enableCSP: true,
  enableFrameProtection: true,
  enableMimeSniffing: true,
};

/**
 * Add security headers to response
 * Call this in your fetch handler or middleware
 */
export function addSecurityHeaders(
  response: Response,
  config: SecurityHeadersConfig = defaultConfig
): Response {
  const headers = new Headers(response.headers);

  // Prevent clickjacking attacks
  if (config.enableFrameProtection) {
    headers.set("X-Frame-Options", "DENY");
  }

  // Prevent MIME type sniffing
  if (config.enableMimeSniffing) {
    headers.set("X-Content-Type-Options", "nosniff");
  }

  // XSS Protection (legacy, but still useful for older browsers)
  headers.set("X-XSS-Protection", "1; mode=block");

  // Control referrer information leakage
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // Content Security Policy (CSP)
  if (config.enableCSP) {
    // Allow inline scripts/styles for React and Tailwind
    // Tighten this for production if possible
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com", // Allow Cloudflare analytics
      "style-src 'self' 'unsafe-inline'", // Tailwind needs inline styles
      "img-src 'self' data:", // Allow data: URIs for images
      "font-src 'self'",
      "connect-src 'self' https://cloudflareinsights.com", // Allow analytics beacon requests
      "frame-ancestors 'none'", // Same as X-Frame-Options: DENY
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    headers.set("Content-Security-Policy", csp);
  }

  // Strict Transport Security (HTTPS only)
  // Only set if running on HTTPS
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Simple CORS configuration for API endpoints
 */
export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(
  request: Request,
  response: Response,
  config: CORSConfig
): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(response.headers);

  // Check if origin is allowed
  if (origin && (config.allowedOrigins.includes(origin) || config.allowedOrigins.includes("*"))) {
    headers.set("Access-Control-Allow-Origin", origin);

    // Only set credentials header if not using wildcard
    if (!config.allowedOrigins.includes("*")) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    headers.set(
      "Access-Control-Allow-Methods",
      config.allowedMethods?.join(", ") || "GET, POST, OPTIONS"
    );

    headers.set(
      "Access-Control-Allow-Headers",
      config.allowedHeaders?.join(", ") || "Content-Type"
    );

    headers.set("Access-Control-Max-Age", (config.maxAge || 86400).toString());

    return new Response(null, { status: 204, headers });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
