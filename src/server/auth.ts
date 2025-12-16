import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "~/lib/context";

/**
 * Simple authentication using a password
 * In production, use a proper auth system
 */
export const login = createServerFn({ method: "POST" }).handler(
  async ({ password }: { password: string }) => {
    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword) {
      throw new Error("Authentication not configured");
    }

    if (password !== authPassword) {
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
    const [password] = decoded.split(":");

    return password === authPassword;
  } catch {
    return false;
  }
};
