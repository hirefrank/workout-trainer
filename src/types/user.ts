/**
 * User-related type definitions for multi-user support
 */

/**
 * User profile stored in KV at `user:{handle}`
 */
export interface User {
  handle: string;
  createdAt: number;
  lastLogin: number;
}

/**
 * Session data stored in KV at `session:{sessionId}`
 * Updated to include user handle for multi-user support
 */
export interface Session {
  handle: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * User's custom bell configuration stored in KV at `user-bells:{handle}`
 * Maps exercise_id to weight values
 */
export interface UserBells {
  [exerciseId: string]: {
    moderate: number;
    heavy: number;
    very_heavy: number;
  };
}

/**
 * Activity entry for community feed stored in `activity:recent`
 */
export interface ActivityEntry {
  handle: string;
  week: number;
  day: number;
  completedAt: string;
}
