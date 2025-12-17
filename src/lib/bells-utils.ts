/**
 * Utilities for bell weight configuration
 */

import type { UserBells } from "~/types/user";
import programData from "~/data/program";

/**
 * Get default bells configuration from program data
 * Returns weights for all exercises that have bells defined
 */
export function getDefaultBells(): UserBells {
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
