/**
 * Settings page for user bell configuration
 */

import type { WorkerEnv } from "~/types/env";
import type { UserBells } from "~/types/user";
import { getAuthenticatedUser } from "~/handlers/api";
import { htmlLayout } from "./layout";
import { escapeHtml } from "~/lib/html";
import programData from "~/data/program";

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
 * Handle settings page request
 */
export async function handleSettings(request: Request, env: WorkerEnv): Promise<Response> {
  // Check authentication
  const authResult = await getAuthenticatedUser(request, env);

  if (!authResult.authenticated || !authResult.handle) {
    // Redirect to main page if not authenticated
    return new Response(null, {
      status: 302,
      headers: { Location: "/workout/" },
    });
  }

  const { handle } = authResult;

  // Load user's bells or defaults
  const bellsKey = `user-bells:${handle}`;
  const userBells = await env.WORKOUTS_KV.get(bellsKey, "json") as UserBells | null;
  const bells = userBells || getDefaultBells();
  const isDefault = !userBells;

  // Get exercise names for display
  const exerciseNames: Record<string, string> = {};
  for (const [id, exercise] of Object.entries(programData.exercises)) {
    if (exercise.bells) {
      exerciseNames[id] = exercise.name;
    }
  }

  // Generate bells form
  const bellsFormRows = Object.entries(bells)
    .map(([exerciseId, weights]) => {
      const name = exerciseNames[exerciseId] || exerciseId;
      return `
        <div class="border-2 border-black p-4 mb-4">
          <h4 class="font-bold mb-3">${escapeHtml(name)}</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">Moderate</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-moderate" value="${weights.moderate}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1">
                <span class="text-xs">lbs</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Heavy</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-heavy" value="${weights.heavy}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1">
                <span class="text-xs">lbs</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Very Heavy</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-very_heavy" value="${weights.very_heavy}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1">
                <span class="text-xs">lbs</span>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const content = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">Settings</h2>
          <p class="text-zinc-600">@${escapeHtml(handle)}</p>
        </div>
        <a href="/workout/" class="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          Back
        </a>
      </div>

      <!-- Bells Configuration -->
      <div class="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Your Bells</h3>
          ${isDefault ? '<span class="text-xs bg-zinc-200 px-2 py-1">Using defaults</span>' : '<span class="text-xs bg-green-200 px-2 py-1">Customized</span>'}
        </div>
        <p class="text-sm text-zinc-600 mb-4">
          Set your kettlebell weights for each intensity level. These will be displayed in your workout cards.
        </p>

        <form id="bells-form" class="space-y-4">
          ${bellsFormRows}

          <div id="bells-status" class="hidden text-sm font-medium py-2"></div>

          <div class="flex gap-2 pt-4 border-t-2 border-black">
            <button type="submit"
                    class="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Save Changes
            </button>
            <button type="button" id="reset-bells"
                    class="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Bells form submission
      const bellsForm = document.getElementById('bells-form');
      const bellsStatus = document.getElementById('bells-status');
      const resetBellsBtn = document.getElementById('reset-bells');

      function showStatus(message, isError = false) {
        bellsStatus.textContent = message;
        bellsStatus.className = isError
          ? 'text-sm font-medium py-2 text-red-600'
          : 'text-sm font-medium py-2 text-green-600';
        bellsStatus.classList.remove('hidden');
      }

      if (bellsForm) {
        bellsForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          // Collect form data
          const formData = new FormData(bellsForm);
          const bells = {};

          for (const [key, value] of formData.entries()) {
            const [exerciseId, level] = key.split('-');
            if (!bells[exerciseId]) {
              bells[exerciseId] = {};
            }
            bells[exerciseId][level] = parseInt(value, 10) || 0;
          }

          try {
            const res = await fetch('/workout/api/bells', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bells }),
            });

            if (res.ok) {
              showStatus('Settings saved successfully!');
              setTimeout(() => bellsStatus.classList.add('hidden'), 3000);
            } else {
              const data = await res.json();
              showStatus(data.error || 'Failed to save settings', true);
            }
          } catch (error) {
            console.error('Save bells error:', error);
            showStatus('Network error. Please try again.', true);
          }
        });
      }

      if (resetBellsBtn) {
        resetBellsBtn.addEventListener('click', async () => {
          if (!confirm('Reset all bells to program defaults?')) return;

          try {
            const res = await fetch('/workout/api/bells', {
              method: 'DELETE',
            });

            if (res.ok) {
              showStatus('Reset to defaults. Reloading...');
              setTimeout(() => window.location.reload(), 1000);
            } else {
              const data = await res.json();
              showStatus(data.error || 'Failed to reset', true);
            }
          } catch (error) {
            console.error('Reset bells error:', error);
            showStatus('Network error. Please try again.', true);
          }
        });
      }
    </script>
  `;

  return new Response(
    htmlLayout(content, "Settings - Workout Trainer"),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    }
  );
}
