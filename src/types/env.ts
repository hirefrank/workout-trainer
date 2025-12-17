export interface WorkerEnv {
  WORKOUTS_KV: KVNamespace;
  AUTH_PASSWORD?: string;
  REGISTRATION_OPEN?: string; // "true" or "false" - controls whether new users can register
}
