import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "~/lib/context";
import { LoginSchema } from "~/server/schemas";

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
 * Simple authentication using a password
 * In production, use a proper auth system
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

    // Generate a simple token using Web Standard btoa (Workers-compatible)
    const token = btoa(`${password}:${Date.now()}`);

    return { success: true, token };
  }
);

/**
 * Verify authentication token
 */
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword) {
      return false;
    }

    // Decode token using Web Standard atob (Workers-compatible)
    const decoded = atob(token);
    const [password, timestamp] = decoded.split(":");

    // Check token expiration (24 hours)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (tokenAge > MAX_AGE) {
      return false; // Token expired
    }

    // Use constant-time comparison to prevent timing attacks
    return constantTimeEqual(password, authPassword);
  } catch {
    return false;
  }
};
