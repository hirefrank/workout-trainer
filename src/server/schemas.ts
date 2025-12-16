import { z } from "zod";

/**
 * Validation schemas for server functions
 */

export const LoginSchema = z.object({
  password: z.string().min(1).max(100),
});

// Deprecated: Use WorkoutQuerySchema instead
// Kept for backward compatibility
export const WorkoutCompletionSchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
  token: z.string().min(1).max(500).optional(),
});

export const WorkoutQuerySchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
});
