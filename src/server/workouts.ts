import { createServerFn } from "@tanstack/react-start";
import { getWorkoutsKV } from "~/lib/context";
import type { CompletedWorkout } from "~/types/program";

/**
 * Get all completed workouts
 */
export const getCompletedWorkouts = createServerFn({ method: "GET" }).handler(
  async () => {
    const kv = getWorkoutsKV();
    const { keys } = await kv.list({ prefix: "workout:" });

    const completions: Record<string, CompletedWorkout> = {};

    for (const key of keys) {
      const value = await kv.get(key.name, "json");
      if (value) {
        completions[key.name] = value as CompletedWorkout;
      }
    }

    return completions;
  }
);

/**
 * Mark a workout as complete
 * Requires authentication token
 */
export const markWorkoutComplete = createServerFn({ method: "POST" }).handler(
  async ({ week, day, token }: { week: number; day: number; token: string }) => {
    // Verify auth token
    const { verifyToken } = await import("~/server/auth");
    const isValid = await verifyToken(token);

    if (!isValid) {
      throw new Error("Unauthorized");
    }

    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    const completion: CompletedWorkout = {
      completedAt: new Date().toISOString(),
    };

    await kv.put(key, JSON.stringify(completion));

    return { success: true, key, completion };
  }
);

/**
 * Unmark a workout (remove completion)
 * Requires authentication token
 */
export const unmarkWorkout = createServerFn({ method: "POST" }).handler(
  async ({ week, day, token }: { week: number; day: number; token: string }) => {
    // Verify auth token
    const { verifyToken } = await import("~/server/auth");
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
  async ({ week, day }: { week: number; day: number }) => {
    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    const value = await kv.get(key, "json");

    return {
      isComplete: value !== null,
      completion: value as CompletedWorkout | null,
    };
  }
);
