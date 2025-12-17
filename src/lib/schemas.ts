import { z } from "zod";
import { programData } from "~/data/program";

/**
 * Validation schemas for API handlers
 * Note: Max weeks dynamically pulled from program.yaml
 */

/**
 * Handle validation: lowercase alphanumeric + hyphens, 3-20 chars
 * Must start and end with alphanumeric
 */
const handleRegex = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

export const LoginSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle must be at most 20 characters")
    .transform((val) => val.toLowerCase())
    .refine((val) => handleRegex.test(val), {
      message: "Handle must be lowercase letters, numbers, and hyphens only (no spaces)",
    }),
  password: z.string().min(1).max(100),
});

export const WorkoutQuerySchema = z.object({
  week: z.number().int().min(1).max(programData.program.weeks),
  day: z.number().int().min(1).max(7),
});

export const WorkoutCompletionWithNotesSchema = z.object({
  week: z.number().int().min(1).max(programData.program.weeks),
  day: z.number().int().min(1).max(7),
  notes: z.string().max(500).optional(),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * User bells configuration schema
 * Each exercise has three weight levels: moderate, heavy, very_heavy
 */
export const BellsSchema = z.object({
  bells: z.record(
    z.object({
      moderate: z.number().min(0).max(500),
      heavy: z.number().min(0).max(500),
      very_heavy: z.number().min(0).max(500),
    })
  ),
});
