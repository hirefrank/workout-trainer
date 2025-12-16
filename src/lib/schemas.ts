import { z } from "zod";
import { programData } from "~/data/program";

/**
 * Validation schemas for API handlers
 * Note: Max weeks dynamically pulled from program.yaml
 */

export const LoginSchema = z.object({
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
