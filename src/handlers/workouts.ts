/**
 * Workout tracking API handlers for vanilla Cloudflare Workers
 * Adapted from server/workouts.ts - Updated for multi-user support
 */

import type { WorkerEnv } from "~/types/env";
import type { ActivityEntry, UserBells } from "~/types/user";
import { WorkoutQuerySchema, WorkoutCompletionWithNotesSchema, PushSubscriptionSchema } from "~/lib/schemas";
import { getAuthenticatedUser } from "./api";
import programData from "~/data/program";

/**
 * Workout completion data stored in KV
 */
interface CompletedWorkout {
  completedAt: string;
  notes?: string;
}

/**
 * Handle GET /api/completions
 * Returns completed workouts for a specific user
 * Query params: ?handle=username (optional, defaults to authenticated user)
 */
export async function handleGetCompletions(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const url = new URL(request.url);
    let handle = url.searchParams.get("handle");

    // If no handle specified, use authenticated user's handle
    if (!handle) {
      const authResult = await getAuthenticatedUser(request, env);
      if (!authResult.authenticated || !authResult.handle) {
        return new Response(
          JSON.stringify({ error: "Handle parameter required or must be authenticated" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      handle = authResult.handle;
    }

    // List user's workout completion keys
    const prefix = `workout:${handle}:`;
    const { keys } = await env.WORKOUTS_KV.list({ prefix });

    // Fetch all completion data in parallel
    const values = await Promise.all(
      keys.map((key) => env.WORKOUTS_KV.get(key.name, "json"))
    );

    // Build completions map (strip user prefix for client compatibility)
    const completions: Record<string, CompletedWorkout> = {};
    keys.forEach((key, index) => {
      if (values[index]) {
        // Convert workout:handle:1-2 back to workout:1-2 for client
        const simpleKey = key.name.replace(`workout:${handle}:`, "workout:");
        completions[simpleKey] = values[index] as CompletedWorkout;
      }
    });

    return new Response(JSON.stringify(completions), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get completions error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch completions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle POST /api/mark-complete
 * Marks a workout as complete (requires authentication)
 * Uses user-scoped KV key: workout:{handle}:{week}-{day}
 */
export async function handleMarkComplete(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;

    // Parse and validate input (with optional notes)
    const body = await request.json();
    const { week, day, notes } = WorkoutCompletionWithNotesSchema.parse(body);

    const completedAt = new Date().toISOString();
    const key = `workout:${handle}:${week}-${day}`;
    const completion: CompletedWorkout = {
      completedAt,
      notes: notes || undefined,
    };

    // Store completion in KV with 180-day TTL
    await env.WORKOUTS_KV.put(key, JSON.stringify(completion), {
      expirationTtl: 60 * 60 * 24 * 180, // 180 days
    });

    // Update activity feed (async, don't wait)
    updateActivityFeed(env, { handle, week, day, completedAt }).catch(console.error);

    return new Response(
      JSON.stringify({ success: true, completion }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Mark complete error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to mark workout complete" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Update the activity feed with a new completion
 * Keeps last 50 entries
 */
async function updateActivityFeed(env: WorkerEnv, entry: ActivityEntry): Promise<void> {
  const feedKey = "activity:recent";
  const existingFeed = await env.WORKOUTS_KV.get(feedKey, "json") as ActivityEntry[] | null;

  const feed = existingFeed || [];

  // Add new entry at the beginning
  feed.unshift(entry);

  // Keep only last 50 entries
  const trimmedFeed = feed.slice(0, 50);

  // Store with 30-day TTL
  await env.WORKOUTS_KV.put(feedKey, JSON.stringify(trimmedFeed), {
    expirationTtl: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Handle POST /api/unmark
 * Removes workout completion (requires authentication)
 * Uses user-scoped KV key: workout:{handle}:{week}-{day}
 */
export async function handleUnmark(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;

    // Parse and validate input
    const body = await request.json();
    const { week, day } = WorkoutQuerySchema.parse(body);

    const key = `workout:${handle}:${week}-${day}`;

    // Delete completion from KV
    await env.WORKOUTS_KV.delete(key);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unmark error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to unmark workout" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle POST /api/subscribe
 * Stores push notification subscription (requires authentication)
 * Uses user-scoped KV key: push-sub:{handle}:{hash}
 */
export async function handleSubscribe(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;

    // Parse and validate subscription
    const body = await request.json();
    const subscription = PushSubscriptionSchema.parse(body);

    // Store subscription in KV with the endpoint as key
    // Hash the endpoint to create a safe key
    const encoder = new TextEncoder();
    const data = encoder.encode(subscription.endpoint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const key = `push-sub:${handle}:${hashHex}`;

    // Store subscription with 30-day TTL
    await env.WORKOUTS_KV.put(key, JSON.stringify(subscription), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Subscribe error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to store subscription" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle GET /api/activity
 * Returns recent activity feed for community display
 */
export async function handleGetActivity(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    const feedKey = "activity:recent";
    const feed = await env.WORKOUTS_KV.get(feedKey, "json") as ActivityEntry[] | null;

    return new Response(JSON.stringify(feed || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get activity error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch activity" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Get default bells configuration from program data
 */
function getDefaultBells(): UserBells {
  const bells: UserBells = {};

  for (const [exerciseId, exercise] of Object.entries(programData.exercises)) {
    if (exercise.bells) {
      bells[exerciseId] = {
        moderate: exercise.bells.moderate,
        heavy: exercise.bells.heavy,
        very_heavy: exercise.bells.very_heavy,
      };
    }
  }

  return bells;
}

/**
 * Handle GET /api/bells
 * Returns user's bell configuration (or defaults if not set)
 */
export async function handleGetBells(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;
    const bellsKey = `user-bells:${handle}`;

    // Get user's custom bells or default
    const userBells = await env.WORKOUTS_KV.get(bellsKey, "json") as UserBells | null;
    const bells = userBells || getDefaultBells();

    return new Response(
      JSON.stringify({ bells, isDefault: !userBells }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Get bells error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch bells" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle POST /api/bells
 * Updates user's bell configuration
 */
export async function handleUpdateBells(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;
    const bellsKey = `user-bells:${handle}`;

    // Parse request body
    const body = await request.json() as { bells: UserBells };

    if (!body.bells || typeof body.bells !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid bells data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate bell values (must be positive numbers)
    for (const [exerciseId, weights] of Object.entries(body.bells)) {
      if (!weights || typeof weights !== "object") {
        return new Response(
          JSON.stringify({ error: `Invalid weights for ${exerciseId}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      for (const [level, value] of Object.entries(weights)) {
        if (typeof value !== "number" || value < 0 || value > 500) {
          return new Response(
            JSON.stringify({ error: `Invalid weight value for ${exerciseId}.${level}` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Store user's bells (no TTL - permanent until deleted)
    await env.WORKOUTS_KV.put(bellsKey, JSON.stringify(body.bells));

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Update bells error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update bells" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle DELETE /api/bells
 * Resets user's bell configuration to defaults
 */
export async function handleResetBells(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication and get handle
    const authResult = await getAuthenticatedUser(request, env);
    if (!authResult.authenticated || !authResult.handle) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { handle } = authResult;
    const bellsKey = `user-bells:${handle}`;

    // Delete user's custom bells (falls back to program defaults)
    await env.WORKOUTS_KV.delete(bellsKey);

    return new Response(
      JSON.stringify({ success: true, bells: getDefaultBells() }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Reset bells error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reset bells" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
