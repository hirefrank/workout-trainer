import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "vinxi/http";
import { getEnvVar, getWorkoutsKV, getCookie, createCookieHeader, deleteCookieHeader } from "~/lib/context";
import { LoginSchema } from "~/server/schemas";

/**
 * Session data stored in KV
 */
interface Session {
  createdAt: number;
  expiresAt: number;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 */
async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to base64
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Verify HMAC-SHA256 signature
 */
async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await hmacSign(message, secret);
  return constantTimeEqual(signature, expectedSignature);
}

/**
 * Secure authentication with HMAC-signed tokens
 * Tokens are stored in HttpOnly cookies and sessions in KV
 */
export const login = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // Validate input to prevent injection and type confusion
    const { password } = LoginSchema.parse(input);

    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword) {
      throw new Error("Authentication not configured");
    }

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(password, authPassword)) {
      throw new Error("Invalid password");
    }

    // Generate cryptographically secure session ID
    const sessionId = crypto.randomUUID();

    // Create session with 24-hour expiration
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    const session: Session = {
      createdAt: now,
      expiresAt,
    };

    // Sign the session ID with HMAC
    const signature = await hmacSign(sessionId, authPassword);

    // Combine sessionId and signature into token
    const token = `${sessionId}.${signature}`;

    // Store session in KV with 24-hour TTL
    const kv = getWorkoutsKV();
    await kv.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24, // 24 hours
    });

    // Set HttpOnly cookie
    setResponseHeader(
      "Set-Cookie",
      createCookieHeader("auth_token", token, {
        maxAge: 60 * 60 * 24, // 24 hours
        secure: true,
        sameSite: "Lax",
      })
    );

    return { success: true };
  }
);

/**
 * Logout - clears authentication cookie
 */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Set-Cookie", deleteCookieHeader("auth_token"));
  return { success: true };
});

/**
 * Check if user is authenticated (reads from HttpOnly cookie)
 */
export const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const isAuthenticated = await isUserAuthenticated();
  return { isAuthenticated };
});

/**
 * Verify HMAC-signed authentication token from HttpOnly cookie
 * Validates signature and checks session in KV
 */
export const isUserAuthenticated = async (): Promise<boolean> => {
  try {
    const token = getCookie("auth_token");

    if (!token) {
      return false; // No auth cookie
    }

    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword) {
      return false;
    }

    // Parse token (format: sessionId.signature)
    const [sessionId, signature] = token.split(".");

    if (!sessionId || !signature) {
      return false; // Invalid token format
    }

    // Verify HMAC signature
    const isValidSignature = await hmacVerify(sessionId, signature, authPassword);

    if (!isValidSignature) {
      return false; // Token has been tampered with
    }

    // Retrieve session from KV
    const kv = getWorkoutsKV();
    const sessionData = await kv.get(`session:${sessionId}`, "json");

    if (!sessionData) {
      return false; // Session not found or expired (KV TTL)
    }

    const session = sessionData as Session;

    // Double-check expiration (defense in depth)
    if (Date.now() > session.expiresAt) {
      return false; // Session expired
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use isUserAuthenticated() instead
 */
export const verifyToken = async (token: string): Promise<boolean> => {
  // This function is kept for backward compatibility
  // but should not be used for new code
  return false;
};
