/**
 * HTML component generators
 * Replaces React components with template literal strings
 */

import { escapeHtml } from "~/lib/html";
import type { Day, WorkoutExercise, Exercise } from "~/types/program";
import type { ActivityEntry } from "~/types/user";

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
    <div class="workout-card border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${completeClass} cursor-pointer hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
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
                  data-is-complete="${isComplete}"
                  onclick="event.stopPropagation()">
            ${buttonText}
          </button>
        `
            : ""
        }
      </div>

      <div class="expand-indicator mt-4 text-sm font-medium text-zinc-700 pointer-events-none select-none">
        <span class="expand-text">Show exercises ↓</span>
      </div>

      <div class="exercise-list mt-4 space-y-3 hidden">
        ${renderExerciseGroups(day.exercises, exercises)}
      </div>
    </div>
  `;
}

/**
 * Group and render exercises with superset headers
 */
function renderExerciseGroups(exercises: WorkoutExercise[], exerciseData: Record<string, Exercise>): string {
  const groups: Array<{type: 'superset' | 'single', exercises: WorkoutExercise[], rounds?: number}> = [];
  let currentSuperset: WorkoutExercise[] = [];
  let supersetRounds = 0;
  let lastSupersetId = '';

  for (const ex of exercises) {
    // Check if exercise is part of a superset (notes contain "Superset X - Y rounds")
    const supersetMatch = ex.notes?.match(/Superset\s+(\d+)\s*-\s*(\d+)\s+rounds?/i);

    if (supersetMatch) {
      const supersetId = `superset-${supersetMatch[1]}`;
      const rounds = parseInt(supersetMatch[2]);

      if (lastSupersetId && lastSupersetId !== supersetId) {
        // Different superset - save previous one
        groups.push({type: 'superset', exercises: currentSuperset, rounds: supersetRounds});
        currentSuperset = [ex];
        lastSupersetId = supersetId;
        supersetRounds = rounds;
      } else {
        // Same superset or first exercise in new superset
        currentSuperset.push(ex);
        lastSupersetId = supersetId;
        supersetRounds = rounds;
      }
    } else {
      // Not a superset exercise
      if (currentSuperset.length > 0) {
        // Save previous superset
        groups.push({type: 'superset', exercises: currentSuperset, rounds: supersetRounds});
        currentSuperset = [];
        lastSupersetId = '';
      }
      // Add as single exercise
      groups.push({type: 'single', exercises: [ex]});
    }
  }

  // Don't forget last superset if any
  if (currentSuperset.length > 0) {
    groups.push({type: 'superset', exercises: currentSuperset, rounds: supersetRounds});
  }

  // Render groups
  return groups.map(group => {
    if (group.type === 'superset') {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      return `
        <div class="superset-group border-2 border-zinc-400 p-3 bg-zinc-50">
          <p class="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-2">Superset, ${group.rounds} ${group.rounds === 1 ? 'round' : 'rounds'}</p>
          ${group.exercises.map((ex, idx) => {
            const label = labels[idx] || `${idx + 1}`;
            return `
              <div class="superset-exercise mb-2 last:mb-0">
                <p class="text-xs font-bold text-zinc-600 mb-1">${label}.</p>
                ${exerciseRow(ex, exerciseData[ex.exercise_id])}
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Single exercise
      return exerciseRow(group.exercises[0], exerciseData[group.exercises[0].exercise_id]);
    }
  }).join('');
}

/**
 * Generate HTML for an exercise row (part of WorkoutCard)
 */
export function exerciseRow(exercise: WorkoutExercise, exerciseData: Exercise): string {
  // Unilateral exercises
  const unilateralExercises = ['turkish-getup', 'suitcase-march'];
  const isUnilateral = unilateralExercises.includes(exercise.exercise_id);

  // Calculate weight display
  let weightDisplay = "";
  if (exercise.weight) {
    // Handle progressive weight notation (e.g., "45→53")
    weightDisplay = String(exercise.weight).includes('→')
      ? `${exercise.weight} lbs`
      : `${exercise.weight} lbs`;
  } else if (exercise.weight_type && exerciseData.bells) {
    weightDisplay = `${exerciseData.bells[exercise.weight_type]} lbs`;
  } else if (exerciseData.type === "bodyweight") {
    weightDisplay = "BW";
  }

  // Weight type label (moderate/heavy/very heavy)
  const weightTypeLabel = exercise.weight_type
    ? ` (${exercise.weight_type.replace(/_/g, " ")})`
    : "";

  // Build exercise description line by line
  let mainLine = "";
  let setsLine = "";

  // Duration-based exercises (DeadBug Arms, Wall Press Abs, etc.)
  if (exercise.duration) {
    mainLine = isUnilateral
      ? `${exercise.duration} per side`
      : `${exercise.duration} per set`;
    setsLine = exercise.sets ? `${exercise.sets} sets` : "";
  }
  // Standard rep-based exercises
  else if (exercise.reps) {
    if (isUnilateral) {
      // Unilateral: "X reps per side • weight"
      mainLine = `${exercise.reps} ${exercise.reps === 1 ? 'rep' : 'reps'} per side • ${weightDisplay}${weightTypeLabel}`;
    } else {
      // Standard: "X reps per set • weight"
      mainLine = `${exercise.reps} ${exercise.reps === 1 ? 'rep' : 'reps'} per set • ${weightDisplay}${weightTypeLabel}`;
    }

    // Handle progressive sets (e.g., "5+4" means 1 set at first weight, 4 sets at second)
    const setsValue = String(exercise.sets || '');
    if (setsValue.includes('+')) {
      const [first, rest] = setsValue.split('+');
      setsLine = `${parseInt(first) + parseInt(rest)} sets total`;
    } else {
      setsLine = exercise.sets ? `${exercise.sets} ${exercise.sets === 1 ? 'set' : 'sets'}` : "";
    }
  }
  // Turkish Getup with no reps specified (standard 1 rep per side)
  else if (isUnilateral && exercise.sets) {
    mainLine = `1 rep per side • ${weightDisplay}${weightTypeLabel}`;
    setsLine = `${exercise.sets} ${exercise.sets === 1 ? 'set' : 'sets'}`;
  }
  // Other exercises with just sets
  else if (exercise.sets) {
    mainLine = weightDisplay ? `${weightDisplay}${weightTypeLabel}` : "";
    setsLine = `${exercise.sets} ${exercise.sets === 1 ? 'set' : 'sets'}`;
  }

  // Progressive notation notes (e.g., "Progressive: 1→2→4 reps per side")
  let notesDisplay = "";
  if (exercise.notes) {
    notesDisplay = `<p class="text-xs text-zinc-600 mt-1">${escapeHtml(exercise.notes)}</p>`;
  }

  return `
    <div class="flex items-start gap-3 p-2 bg-white border border-zinc-300">
      <div class="flex-1">
        <p class="font-medium">
          ${escapeHtml(exerciseData.name)}
          ${exerciseData.youtube_url ? `<a href="${escapeHtml(exerciseData.youtube_url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="inline-flex items-center justify-center ml-1.5 w-4 h-4 bg-red-600 hover:bg-red-700 text-white rounded-sm border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" aria-label="Watch ${escapeHtml(exerciseData.name)} tutorial on YouTube" title="Watch tutorial"><span class="text-[8px] ml-[0.5px]">▶</span></a>` : ''}
        </p>
        ${mainLine ? `<p class="text-sm text-zinc-600">${escapeHtml(mainLine)}</p>` : ""}
        ${setsLine ? `<p class="text-sm font-medium text-zinc-700">${escapeHtml(setsLine)}</p>` : ""}
        ${notesDisplay}
      </div>
    </div>
  `;
}

/**
 * Generate HTML for authentication modal
 * Updated for multi-user: includes handle field
 */
export function authModal(): string {
  return `
    <div id="auth-modal" class="hidden fixed inset-0 left-0 right-0 top-0 bottom-0 bg-black/50 flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="bg-white border-2 border-black p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 id="auth-modal-title" class="text-xl font-bold mb-4">Join Workout</h3>
        <form id="login-form" class="space-y-4">
          <div>
            <label for="handle-input" class="block text-sm font-medium mb-1">Your Handle</label>
            <input type="text" id="handle-input"
                   class="w-full px-3 py-2 border-2 border-black"
                   placeholder="e.g., frank"
                   pattern="[a-z0-9][a-z0-9-]{1,18}[a-z0-9]"
                   minlength="3" maxlength="20"
                   autocomplete="username"
                   autofocus>
            <p class="text-xs text-zinc-600 mt-1">3-20 characters, lowercase letters, numbers, hyphens</p>
          </div>
          <div>
            <label for="password-input" class="block text-sm font-medium mb-1">Password</label>
            <div class="relative">
              <input type="password" id="password-input"
                     class="w-full px-3 py-2 pr-10 border-2 border-black"
                     placeholder="Shared password"
                     autocomplete="current-password">
              <button type="button" id="toggle-password"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-black"
                      aria-label="Toggle password visibility">
                <svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg id="eye-off-icon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>
          <div id="login-error" class="hidden text-red-600 text-sm font-medium"></div>
          <div class="flex gap-2">
            <button type="submit"
                    class="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Join
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
    <div id="notes-modal" class="hidden fixed inset-0 left-0 right-0 top-0 bottom-0 bg-black/50 flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-labelledby="notes-modal-title">
      <div class="bg-white border-2 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 id="notes-modal-title" class="text-xl font-bold mb-2">Add Notes (Optional)</h3>
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

/**
 * Generate HTML for the community activity feed
 */
export function activityFeed(activities: ActivityEntry[] | null, currentHandle?: string): string {
  if (!activities || activities.length === 0) {
    return `
      <div id="activity-feed" class="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="font-bold text-lg mb-2">Community Activity</h3>
        <div id="activity-items" class="text-sm">
          <p class="text-zinc-600">No recent activity yet. Be the first to complete a workout!</p>
        </div>
      </div>
    `;
  }

  // Format relative time
  function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const activityItems = activities.slice(0, 10).map((activity) => {
    const isCurrentUser = currentHandle && activity.handle === currentHandle;
    const handleDisplay = isCurrentUser ? "You" : `@${escapeHtml(activity.handle)}`;
    const handleClass = isCurrentUser ? "font-bold text-green-600" : "font-medium";

    return `
      <div class="flex items-center gap-2 py-2 border-b border-zinc-200 last:border-0">
        <span class="${handleClass}">${handleDisplay}</span>
        <span class="text-zinc-600">completed</span>
        <span class="font-medium">Week ${activity.week}, Day ${activity.day}</span>
        <span class="text-xs text-zinc-600 ml-auto">${timeAgo(activity.completedAt)}</span>
      </div>
    `;
  }).join("");

  return `
    <div id="activity-feed" class="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 class="font-bold text-lg mb-2">Community Activity</h3>
      <div id="activity-items" class="text-sm">
        ${activityItems}
      </div>
    </div>
  `;
}
