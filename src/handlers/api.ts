/**
 * Authentication API handlers for vanilla Cloudflare Workers
 * Adapted from server/auth.ts - Updated for multi-user support
 */

import type { WorkerEnv } from "~/types/env";
import type { User, Session } from "~/types/user";
import {
  parseCookie,
  createCookieHeader,
  deleteCookieHeader,
} from "~/lib/cookies";
import { constantTimeEqual, hmacSign, hmacVerify } from "~/lib/auth-utils";
import { LoginSchema } from "~/lib/schemas";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "~/lib/rate-limit";

/**
 * Result of authentication check
 */
export interface AuthResult {
  authenticated: boolean;
  handle?: string;
}

/**
 * Handle POST /api/login
 * Validates handle + password and creates HMAC-signed session token
 * Creates new user if registration is open and handle doesn't exist
 */
export async function handleLogin(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  try {
    // Check rate limit for login endpoint
    const isRateLimited = await checkRateLimit(
      request,
      env,
      "login",
      RATE_LIMITS.LOGIN,
    );
    if (isRateLimited) {
      return rateLimitResponse(60);
    }

    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.errors[0]?.message || "Invalid input";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { handle, password } = parseResult.data;

    const authPassword = env.AUTH_PASSWORD;

    if (!authPassword) {
      return new Response(
        JSON.stringify({ error: "Authentication not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(password, authPassword)) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user exists
    const userKey = `user:${handle}`;
    const existingUser = (await env.WORKOUTS_KV.get(
      userKey,
      "json",
    )) as User | null;

    const now = Date.now();

    // Generate cryptographically secure session ID
    const sessionId = crypto.randomUUID();

    // Create session with 30-day expiration
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    const session: Session = {
      handle,
      createdAt: now,
      expiresAt,
    };

    // Sign the session ID with HMAC
    const signature = await hmacSign(sessionId, authPassword);

    // Combine sessionId and signature into token
    const token = `${sessionId}.${signature}`;

    // Store user and session in parallel
    if (!existingUser) {
      // User doesn't exist - check if registration is open
      const registrationOpen = env.REGISTRATION_OPEN === "true";

      if (!registrationOpen) {
        return new Response(
          JSON.stringify({
            error: "Registration is closed. Contact admin to join.",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      // Create new user
      const newUser: User = {
        handle,
        createdAt: now,
        lastLogin: now,
      };

      await Promise.all([
        env.WORKOUTS_KV.put(userKey, JSON.stringify(newUser), {
          expirationTtl: 60 * 60 * 24 * 365 * 2, // 2 years
        }),
        env.WORKOUTS_KV.put(`session:${sessionId}`, JSON.stringify(session), {
          expirationTtl: 60 * 60 * 24 * 30, // 30 days
        }),
      ]);
    } else {
      // Update last login time
      const updatedUser: User = {
        ...existingUser,
        lastLogin: now,
      };

      await Promise.all([
        env.WORKOUTS_KV.put(userKey, JSON.stringify(updatedUser), {
          expirationTtl: 60 * 60 * 24 * 365 * 2, // 2 years
        }),
        env.WORKOUTS_KV.put(`session:${sessionId}`, JSON.stringify(session), {
          expirationTtl: 60 * 60 * 24 * 30, // 30 days
        }),
      ]);
    }

    // Return success with Set-Cookie header and handle
    return new Response(
      JSON.stringify({ success: true, handle, isNewUser: !existingUser }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createCookieHeader("auth_token", token, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            secure: true,
            sameSite: "Lax",
          }),
        },
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle POST /api/logout
 * Clears authentication cookie
 */
export async function handleLogout(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": deleteCookieHeader("auth_token"),
    },
  });
}

/**
 * Handle GET /api/check-auth
 * Returns current authentication status and handle
 */
export async function handleCheckAuth(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const authResult = await getAuthenticatedUser(request, env);

  return new Response(
    JSON.stringify({
      isAuthenticated: authResult.authenticated,
      handle: authResult.handle,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Get authenticated user from HMAC-signed token in HttpOnly cookie
 * Returns AuthResult with handle if authenticated
 */
export async function getAuthenticatedUser(
  request: Request,
  env: WorkerEnv,
): Promise<AuthResult> {
  try {
    const token = parseCookie(request, "auth_token");

    if (!token) {
      return { authenticated: false }; // No auth cookie
    }

    const authPassword = env.AUTH_PASSWORD;

    if (!authPassword) {
      return { authenticated: false };
    }

    // Parse token (format: sessionId.signature)
    const [sessionId, signature] = token.split(".");

    if (!sessionId || !signature) {
      return { authenticated: false }; // Invalid token format
    }

    // Verify HMAC signature
    const isValidSignature = await hmacVerify(
      sessionId,
      signature,
      authPassword,
    );

    if (!isValidSignature) {
      return { authenticated: false }; // Token has been tampered with
    }

    // Retrieve session from KV
    const sessionData = await env.WORKOUTS_KV.get(
      `session:${sessionId}`,
      "json",
    );

    if (!sessionData) {
      return { authenticated: false }; // Session not found or expired (KV TTL)
    }

    const session = sessionData as Session;

    // Double-check expiration (defense in depth)
    if (Date.now() > session.expiresAt) {
      return { authenticated: false }; // Session expired
    }

    return { authenticated: true, handle: session.handle };
  } catch {
    return { authenticated: false };
  }
}
