/**
 * Authentication API handlers for vanilla Cloudflare Workers
 * Adapted from server/auth.ts
 */

import type { WorkerEnv } from "~/types/env";
import { parseCookie, createCookieHeader, deleteCookieHeader } from "~/lib/cookies";
import { constantTimeEqual, hmacSign, hmacVerify } from "~/lib/auth-utils";
import { LoginSchema } from "~/server/schemas";

/**
 * Session data stored in KV
 */
interface Session {
  createdAt: number;
  expiresAt: number;
}

/**
 * Handle POST /api/login
 * Validates password and creates HMAC-signed session token
 */
export async function handleLogin(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const body = await request.json();
    const { password } = LoginSchema.parse(body);

    const authPassword = env.AUTH_PASSWORD;

    if (!authPassword) {
      return new Response(
        JSON.stringify({ error: "Authentication not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use constant-time comparison to prevent timing attacks
    if (!constantTimeEqual(password, authPassword)) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
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
    await env.WORKOUTS_KV.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24, // 24 hours
    });

    // Return success with Set-Cookie header
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createCookieHeader("auth_token", token, {
            maxAge: 60 * 60 * 24, // 24 hours
            secure: true,
            sameSite: "Lax",
          }),
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Login failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle POST /api/logout
 * Clears authentication cookie
 */
export async function handleLogout(request: Request, env: WorkerEnv): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": deleteCookieHeader("auth_token"),
      },
    }
  );
}

/**
 * Handle GET /api/check-auth
 * Returns current authentication status
 */
export async function handleCheckAuth(request: Request, env: WorkerEnv): Promise<Response> {
  const isAuthenticated = await isUserAuthenticated(request, env);

  return new Response(
    JSON.stringify({ isAuthenticated }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Verify HMAC-signed authentication token from HttpOnly cookie
 * Validates signature and checks session in KV
 */
export async function isUserAuthenticated(request: Request, env: WorkerEnv): Promise<boolean> {
  try {
    const token = parseCookie(request, "auth_token");

    if (!token) {
      return false; // No auth cookie
    }

    const authPassword = env.AUTH_PASSWORD;

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
    const sessionData = await env.WORKOUTS_KV.get(`session:${sessionId}`, "json");

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
}
