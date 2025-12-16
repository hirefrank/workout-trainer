/**
 * Workout tracking API handlers for vanilla Cloudflare Workers
 * Adapted from server/workouts.ts
 */

import type { WorkerEnv } from "~/types/env";
import { WorkoutQuerySchema, WorkoutCompletionWithNotesSchema, PushSubscriptionSchema } from "~/lib/schemas";
import { isUserAuthenticated } from "./api";

/**
 * Workout completion data stored in KV
 */
interface CompletedWorkout {
  completedAt: string;
}

/**
 * Handle GET /api/completions
 * Returns all completed workouts from KV
 */
export async function handleGetCompletions(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // List all workout completion keys
    const { keys } = await env.WORKOUTS_KV.list({ prefix: "workout:" });

    // Fetch all completion data in parallel
    const values = await Promise.all(
      keys.map((key) => env.WORKOUTS_KV.get(key.name, "json"))
    );

    // Build completions map
    const completions: Record<string, CompletedWorkout> = {};
    keys.forEach((key, index) => {
      if (values[index]) {
        completions[key.name] = values[index] as CompletedWorkout;
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
 */
export async function handleMarkComplete(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication
    if (!(await isUserAuthenticated(request, env))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input (with optional notes)
    const body = await request.json();
    const { week, day, notes } = WorkoutCompletionWithNotesSchema.parse(body);

    const key = `workout:${week}-${day}`;
    const completion: CompletedWorkout = {
      completedAt: new Date().toISOString(),
      notes: notes || undefined,
    };

    // Store completion in KV with 180-day TTL
    await env.WORKOUTS_KV.put(key, JSON.stringify(completion), {
      expirationTtl: 60 * 60 * 24 * 180, // 180 days
    });

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
 * Handle POST /api/unmark
 * Removes workout completion (requires authentication)
 */
export async function handleUnmark(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication
    if (!(await isUserAuthenticated(request, env))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const { week, day } = WorkoutQuerySchema.parse(body);

    const key = `workout:${week}-${day}`;

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
 */
export async function handleSubscribe(request: Request, env: WorkerEnv): Promise<Response> {
  try {
    // Check authentication
    if (!(await isUserAuthenticated(request, env))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

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
    const key = `push-sub:${hashHex}`;

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
