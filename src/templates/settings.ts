/**
 * Settings page for user bell configuration
 */

import type { WorkerEnv } from "~/types/env";
import type { UserBells } from "~/types/user";
import { getAuthenticatedUser } from "~/handlers/api";
import { htmlLayout } from "./layout";
import { escapeHtml } from "~/lib/html";
import programData from "~/data/program";
import { getDefaultBells } from "~/lib/bells-utils";

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
  const unit = userBells?.unit || "lbs";
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
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">Moderate</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-moderate" value="${weights.moderate}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1" required>
                <span class="text-xs unit-label">${unit}</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Heavy</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-heavy" value="${weights.heavy}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1" required>
                <span class="text-xs unit-label">${unit}</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Very Heavy</label>
              <div class="flex items-center gap-1">
                <input type="number" name="${exerciseId}-very_heavy" value="${weights.very_heavy}"
                       class="w-full px-2 py-1 border-2 border-black text-center"
                       min="0" max="500" step="1" required>
                <span class="text-xs unit-label">${unit}</span>
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
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">Settings</h2>
          <p class="text-zinc-600">@${escapeHtml(handle)}</p>
        </div>
        <a href="/workout/" class="w-full sm:w-auto text-center px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
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
          <!-- Unit Selection -->
          <div class="pb-4 border-b-2 border-black">
            <label class="block text-sm font-medium mb-2">Weight Unit</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="unit" value="lbs" ${unit === "lbs" ? "checked" : ""} class="w-4 h-4 border-2 border-black">
                <span class="font-medium">lbs (pounds)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="unit" value="kg" ${unit === "kg" ? "checked" : ""} class="w-4 h-4 border-2 border-black">
                <span class="font-medium">kg (kilograms)</span>
              </label>
            </div>
          </div>
          ${bellsFormRows}

          <div id="bells-status" class="hidden text-sm font-medium py-2"></div>

          <div class="flex flex-col sm:flex-row gap-2 pt-4 border-t-2 border-black">
            <button type="submit"
                    class="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
              Save Changes
            </button>
            <button type="button" id="reset-bells"
                    class="w-full sm:w-auto px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
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

      // Track unsaved changes
      let hasUnsavedChanges = false;

      // Update unit labels when radio changes
      document.querySelectorAll('input[name="unit"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const newUnit = e.target.value;
          document.querySelectorAll('.unit-label').forEach(label => {
            label.textContent = newUnit;
          });
          hasUnsavedChanges = true;
        });
      });

      function showStatus(message, isError = false) {
        bellsStatus.textContent = message;
        bellsStatus.className = isError
          ? 'text-sm font-medium py-2 text-red-600'
          : 'text-sm font-medium py-2 text-green-600';
        bellsStatus.classList.remove('hidden');
      }

      // Track input changes
      if (bellsForm) {
        bellsForm.addEventListener('input', () => {
          hasUnsavedChanges = true;
        });

        // Warn before leaving page with unsaved changes
        window.addEventListener('beforeunload', (e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires returnValue to be set
          }
        });
      }

      if (bellsForm) {
        bellsForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          // Show loading state
          const submitBtn = bellsForm.querySelector('button[type="submit"]');
          const originalText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';

          // Collect form data
          const formData = new FormData(bellsForm);
          const bells = {};

          // Get selected unit
          const selectedUnit = formData.get('unit');
          bells.unit = selectedUnit;

          // Validate and collect all values
          let hasError = false;
          for (const [key, value] of formData.entries()) {
            // Skip the unit field
            if (key === 'unit') continue;

            // Split from the right to handle exercise IDs with hyphens (e.g., "2-hand-swing-moderate")
            const lastDashIndex = key.lastIndexOf('-');
            const exerciseId = key.substring(0, lastDashIndex);
            const level = key.substring(lastDashIndex + 1);

            if (!bells[exerciseId]) {
              bells[exerciseId] = {};
            }
            const numValue = parseInt(value, 10);
            if (isNaN(numValue) || numValue < 0 || numValue > 500) {
              showStatus(`All weights must be between 0 and 500 ${selectedUnit}`, true);
              hasError = true;
              break;
            }
            bells[exerciseId][level] = numValue;
          }

          if (hasError) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
          }

          try {
            const res = await fetch('/workout/api/bells', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bells }),
            });

            if (res.ok) {
              hasUnsavedChanges = false; // Clear unsaved changes flag
              showStatus('Settings saved successfully!');
              setTimeout(() => bellsStatus.classList.add('hidden'), 3000);
            } else {
              const data = await res.json();
              showStatus(data.error || 'Failed to save settings', true);
            }
          } catch (error) {
            console.error('Save bells error:', error);
            showStatus('Network error. Please try again.', true);
          } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        });
      }

      if (resetBellsBtn) {
        resetBellsBtn.addEventListener('click', async () => {
          if (!confirm('Reset all bells to program defaults?')) return;

          // Show loading state
          const originalText = resetBellsBtn.textContent;
          resetBellsBtn.disabled = true;
          resetBellsBtn.textContent = 'Resetting...';

          try {
            const res = await fetch('/workout/api/bells', {
              method: 'DELETE',
            });

            if (res.ok) {
              hasUnsavedChanges = false; // Clear unsaved changes flag before reload
              showStatus('Reset to defaults. Reloading...');
              setTimeout(() => window.location.reload(), 1000);
            } else {
              const data = await res.json();
              showStatus(data.error || 'Failed to reset', true);
              // Reset button state on error
              resetBellsBtn.disabled = false;
              resetBellsBtn.textContent = originalText;
            }
          } catch (error) {
            console.error('Reset bells error:', error);
            showStatus('Network error. Please try again.', true);
            // Reset button state on error
            resetBellsBtn.disabled = false;
            resetBellsBtn.textContent = originalText;
          }
        });
      }

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl+S / Cmd+S: Save changes
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          if (bellsForm) {
            bellsForm.requestSubmit();
          }
        }
        // Ctrl+R / Cmd+R: Reset to defaults (with confirmation)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
          e.preventDefault();
          if (resetBellsBtn && confirm('Reset all bells to program defaults?')) {
            resetBellsBtn.click();
          }
        }
      });
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
