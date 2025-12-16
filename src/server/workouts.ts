import { createServerFn } from "@tanstack/react-start";
import { getWorkoutsKV } from "~/lib/context";
import type { CompletedWorkout } from "~/types/program";
import { verifyToken } from "~/server/auth";
import { WorkoutCompletionSchema, WorkoutQuerySchema } from "~/server/schemas";

/**
 * Get all completed workouts
 */
export const getCompletedWorkouts = createServerFn({ method: "GET" }).handler(
  async () => {
    const kv = getWorkoutsKV();
    const { keys } = await kv.list({ prefix: "workout:" });

    // Parallel KV operations for better performance (vs sequential loop)
    const values = await Promise.all(
      keys.map(key => kv.get(key.name, "json"))
    );

    const completions: Record<string, CompletedWorkout> = {};
    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        completions[key.name] = value as CompletedWorkout;
      }
    });

    return completions;
  }
);

/**
 * Mark a workout as complete
 * Requires authentication token
 */
export const markWorkoutComplete = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // Validate input to prevent injection and type confusion
    const { week, day, token } = WorkoutCompletionSchema.parse(input);

    // Verify auth token (now using static import)
    const isValid = await verifyToken(token);

    if (!isValid) {
      throw new Error("Unauthorized");
    }

    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    const completion: CompletedWorkout = {
      completedAt: new Date().toISOString(),
    };

    // Add TTL: 6 months (reasonable for workout history)
    await kv.put(key, JSON.stringify(completion), {
      expirationTtl: 60 * 60 * 24 * 180  // 180 days
    });

    return { success: true, key, completion };
  }
);

/**
 * Unmark a workout (remove completion)
 * Requires authentication token
 */
export const unmarkWorkout = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // Validate input to prevent injection and type confusion
    const { week, day, token } = WorkoutCompletionSchema.parse(input);

    // Verify auth token (now using static import)
    const isValid = await verifyToken(token);

    if (!isValid) {
      throw new Error("Unauthorized");
    }

    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    await kv.delete(key);

    return { success: true, key };
  }
);

/**
 * Check if a specific workout is complete
 */
export const isWorkoutComplete = createServerFn({ method: "GET" }).handler(
  async (input) => {
    // Validate input to prevent injection and type confusion
    const { week, day } = WorkoutQuerySchema.parse(input);

    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    const value = await kv.get(key, "json");

    return {
      isComplete: value !== null,
      completion: value as CompletedWorkout | null,
    };
  }
);
