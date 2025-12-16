import { z } from "zod";

/**
 * Validation schemas for API handlers
 */

export const LoginSchema = z.object({
  password: z.string().min(1).max(100),
});

export const WorkoutQuerySchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
});

export const WorkoutCompletionWithNotesSchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
  notes: z.string().max(500).optional(),
});
