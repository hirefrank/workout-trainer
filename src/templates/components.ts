/**
 * HTML component generators
 * Replaces React components with template literal strings
 */

import { escapeHtml } from "~/lib/html";
import type { Day, WorkoutExercise, Exercise } from "~/types/program";

/**
 * Generate HTML for a workout card (replaces WorkoutCard.tsx)
 */
export function workoutCard(
  week: number,
  day: Day,
  exercises: Record<string, Exercise>,
  isComplete: boolean,
  canEdit: boolean,
  completionNotes?: string
): string {
  const completeClass = isComplete ? "bg-green-100" : "";
  const buttonClass = isComplete
    ? "bg-white hover:bg-zinc-100"
    : "bg-green-400 hover:bg-green-500";
  const buttonText = isComplete ? "Undo" : "Complete";

  return `
    <div class="workout-card border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${completeClass}"
         data-week="${week}" data-day="${day.number}">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-lg">Day ${day.number}: ${escapeHtml(day.name)}</h3>
            ${
              isComplete
                ? '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>'
                : ""
            }
          </div>
          <p class="text-sm text-zinc-600 mt-1">${day.exercises.length} exercises</p>
          ${
            isComplete && completionNotes
              ? `<p class="text-sm text-zinc-700 mt-2 italic bg-zinc-50 p-2 border border-zinc-300">📝 ${escapeHtml(completionNotes)}</p>`
              : ""
          }
        </div>

        ${
          canEdit
            ? `
          <button class="complete-btn px-4 py-2 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${buttonClass}"
                  data-week="${week}" data-day="${day.number}"
                  data-is-complete="${isComplete}">
            ${buttonText}
          </button>
        `
            : ""
        }
      </div>

      <button class="expand-btn mt-4 text-sm font-medium text-zinc-700 hover:text-black">
        Show exercises ↓
      </button>

      <div class="exercise-list mt-4 space-y-2 hidden">
        ${day.exercises.map((ex) => exerciseRow(ex, exercises[ex.exercise_id])).join("")}
      </div>
    </div>
  `;
}

/**
 * Generate HTML for an exercise row (part of WorkoutCard)
 */
export function exerciseRow(exercise: WorkoutExercise, exerciseData: Exercise): string {
  // Calculate weight display
  let weight = "";
  if (exercise.weight) {
    weight = `${exercise.weight} lbs`;
  } else if (exercise.weight_type && exerciseData.bells) {
    weight = `${exerciseData.bells[exercise.weight_type]} lbs`;
  } else if (exerciseData.type === "bodyweight") {
    weight = "BW";
  }

  // Build sets/reps/duration string
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} sets`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  if (exercise.duration) parts.push(exercise.duration);
  const setsReps = parts.length > 0 ? parts.join(" × ") : "—";

  // Weight type label
  const weightTypeLabel = exercise.weight_type
    ? `<span class="ml-2 text-xs uppercase text-zinc-500">(${escapeHtml(
        exercise.weight_type.replace(/_/g, " ")
      )})</span>`
    : "";

  return `
    <div class="flex items-start gap-3 p-2 bg-white border border-zinc-300">
      <div class="flex-1">
        <p class="font-medium">${escapeHtml(exerciseData.name)}</p>
        <p class="text-sm text-zinc-600">
          ${escapeHtml(setsReps)} • ${escapeHtml(weight)}
          ${weightTypeLabel}
        </p>
        ${exercise.notes ? `<p class="text-xs text-zinc-500 mt-1">${escapeHtml(exercise.notes)}</p>` : ""}
      </div>
    </div>
  `;
}

/**
 * Generate HTML for authentication modal
 */
export function authModal(): string {
  return `
    <div id="auth-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white border-2 border-black p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="text-xl font-bold mb-4">Enter Password</h3>
        <form id="login-form" class="space-y-4">
          <input type="password" id="password-input"
                 class="w-full px-3 py-2 border-2 border-black"
                 placeholder="Password" autofocus>
          <div class="flex gap-2">
            <button type="submit"
                    class="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Login
            </button>
            <button type="button" id="cancel-auth"
                    class="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for notes modal (shown when marking workout complete)
 */
export function notesModal(): string {
  return `
    <div id="notes-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white border-2 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="text-xl font-bold mb-2">Add Notes (Optional)</h3>
        <p class="text-sm text-zinc-600 mb-4">How did the workout feel?</p>
        <form id="notes-form" class="space-y-4">
          <textarea id="notes-input"
                    class="w-full px-3 py-2 border-2 border-black min-h-[100px] resize-y"
                    placeholder="e.g., Felt strong today, increased weight on swings..."
                    maxlength="500"></textarea>
          <div class="flex gap-2">
            <button type="submit"
                    class="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Complete
            </button>
            <button type="button" id="skip-notes"
                    class="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Skip
            </button>
            <button type="button" id="cancel-notes"
                    class="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
