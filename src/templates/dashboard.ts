/**
 * Main dashboard page generator
 * Replaces routes/index.tsx with server-rendered HTML
 */

import type { WorkerEnv } from "~/types/env";
import { isUserAuthenticated } from "~/handlers/api";
import { htmlLayout } from "./layout";
import { workoutCard, authModal, notesModal } from "./components";
import { escapeHtml } from "~/lib/html";
import programData from "~/data/program";

/**
 * Handle main dashboard page
 * Generates complete HTML for workout tracker
 */
export async function handleDashboard(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const weekParam = url.searchParams.get("week");
  const currentWeek = weekParam ? parseInt(weekParam, 10) : 1;

  // Validate week parameter
  if (isNaN(currentWeek) || currentWeek < 1 || currentWeek > 16) {
    return new Response(
      htmlLayout(
        `<div class="text-center py-12">
          <p class="text-red-600 font-bold">Invalid week: ${escapeHtml(String(currentWeek))}</p>
          <p class="mt-2">
            <a href="/workout/" class="text-blue-600 hover:underline">Go to Week 1</a>
          </p>
        </div>`,
        "Invalid Week"
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Check authentication
  const isAuth = await isUserAuthenticated(request, env);

  // Load completions from KV
  const { keys } = await env.WORKOUTS_KV.list({ prefix: "workout:" });
  const values = await Promise.all(keys.map((key) => env.WORKOUTS_KV.get(key.name, "json")));

  const completions: Record<string, any> = {};
  keys.forEach((key, index) => {
    if (values[index]) {
      completions[key.name] = values[index];
    }
  });

  // Find week data
  const week = programData.weeks.find((w) => w.number === currentWeek);

  if (!week) {
    return new Response(
      htmlLayout(
        `<div class="text-center py-12">
          <p class="text-red-600 font-bold">Week ${currentWeek} not found</p>
          <p class="mt-2">
            <a href="/workout/" class="text-blue-600 hover:underline">Go to Week 1</a>
          </p>
        </div>`,
        "Week Not Found"
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const totalWeeks = programData.program.weeks;
  const completedCount = week.days.filter(
    (day) => !!completions[`workout:${currentWeek}-${day.number}`]
  ).length;

  // Generate page HTML
  const content = `
    <div class="space-y-6" data-current-week="${currentWeek}">
      <!-- Week Navigation -->
      <div class="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-bold">
              Week ${currentWeek} ${week.is_deload ? '<span class="text-red-600">🔴 DELOAD</span>' : ""}
            </h2>
            <p class="text-zinc-600">${escapeHtml(week.phase)}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium">${completedCount} / ${week.days.length} days</p>
            ${
              isAuth
                ? `
              <button id="logout-btn" class="text-xs text-zinc-600 hover:text-black mt-1">Logout</button>
            `
                : `
              <button id="login-trigger" class="text-xs text-blue-600 hover:text-blue-800 mt-1">Login to track</button>
            `
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="prev-week" ${currentWeek === 1 ? "disabled" : ""}
                  class="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            ←
          </button>

          <div class="flex-1 bg-zinc-200 h-2 border border-black">
            <div class="bg-green-500 h-full" style="width: ${(currentWeek / totalWeeks) * 100}%"></div>
          </div>

          <button id="next-week" ${currentWeek === totalWeeks ? "disabled" : ""}
                  class="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            →
          </button>
        </div>
      </div>

      ${authModal()}
      ${notesModal()}

      <!-- Workouts -->
      <div class="space-y-4">
        ${week.days
          .map((day) => {
            const completionKey = `workout:${currentWeek}-${day.number}`;
            const completion = completions[completionKey];
            return workoutCard(
              currentWeek,
              day,
              programData.exercises,
              !!completion,
              isAuth,
              completion?.notes
            );
          })
          .join("")}
      </div>
    </div>
  `;

  return new Response(htmlLayout(content, `${programData.program.name} - Week ${currentWeek}`), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
