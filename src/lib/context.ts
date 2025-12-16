import type { WorkerEnv } from "~/types/env";

/**
 * Get the Cloudflare environment from the async context
 */
export function getEnv(): WorkerEnv {
  // @ts-expect-error - Cloudflare Workers async context
  return globalThis[Symbol.for("cloudflare:env")];
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof WorkerEnv>(key: K): WorkerEnv[K] {
  const env = getEnv();
  return env[key];
}

/**
 * Get the KV namespace for workout completions
 */
export function getWorkoutsKV(): KVNamespace {
  return getEnvVar("WORKOUTS_KV");
}
