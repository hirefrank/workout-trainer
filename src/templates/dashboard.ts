/**
 * Main dashboard page generator
 * Replaces routes/index.tsx with server-rendered HTML
 * Updated for multi-user support
 */

import type { WorkerEnv } from "~/types/env";
import type { ActivityEntry } from "~/types/user";
import { getAuthenticatedUser } from "~/handlers/api";
import { htmlLayout } from "./layout";
import { workoutCard, authModal, notesModal, activityFeed } from "./components";
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
  if (isNaN(currentWeek) || currentWeek < 1 || currentWeek > programData.program.weeks) {
    return new Response(
      htmlLayout(
        `<div class="text-center py-12">
          <p class="text-red-600 font-bold">Invalid week: ${escapeHtml(String(currentWeek))}</p>
          <p class="mt-2">
            <a href="/workout/" class="text-blue-600 hover:underline">Go to Week 1</a>
          </p>
        </div>`,
        "Invalid Week",
        undefined,
        undefined,
        { weeks: programData.program.weeks, daysPerWeek: programData.program.days_per_week }
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Check authentication and get user handle
  const authResult = await getAuthenticatedUser(request, env);
  const isAuth = authResult.authenticated;
  const userHandle = authResult.handle;

  // Load user-specific completions and bells from KV
  let completions: Record<string, any> = {};
  let activityData: ActivityEntry[] | null = null;
  let userUnit = "lbs"; // default unit

  try {
    if (userHandle) {
      const prefix = `workout:${userHandle}:`;
      const { keys } = await env.WORKOUTS_KV.list({ prefix });
      const values = await Promise.all(keys.map((key) => env.WORKOUTS_KV.get(key.name, "json")));

      keys.forEach((key, index) => {
        if (values[index]) {
          // Convert workout:handle:1-2 back to workout:1-2 for consistency
          const simpleKey = key.name.replace(`workout:${userHandle}:`, "workout:");
          completions[simpleKey] = values[index];
        }
      });

      // Load user's unit preference from their bells
      const userBells = await env.WORKOUTS_KV.get(`user-bells:${userHandle}`, "json") as any;
      if (userBells?.unit) {
        userUnit = userBells.unit;
      }
    }

    // Load activity feed for community display
    activityData = await env.WORKOUTS_KV.get("activity:recent", "json") as ActivityEntry[] | null;
  } catch (error) {
    console.error("KV error loading dashboard data:", error);
    return new Response(
      htmlLayout(
        `<div class="text-center py-12">
          <p class="text-red-600 font-bold">Error loading workout data</p>
          <p class="mt-2 text-zinc-600">Please try refreshing the page.</p>
          <p class="mt-4">
            <a href="/workout/" class="text-blue-600 hover:underline">Refresh</a>
          </p>
        </div>`,
        "Error - Workout Trainer",
        undefined,
        undefined,
        { weeks: programData.program.weeks, daysPerWeek: programData.program.days_per_week }
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

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
        "Week Not Found",
        undefined,
        undefined,
        { weeks: programData.program.weeks, daysPerWeek: programData.program.days_per_week }
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

  // Calculate total completed workouts across all weeks
  const totalWorkouts = programData.weeks.reduce((sum, w) => sum + w.days.length, 0);
  const totalCompleted = Object.keys(completions).filter((key) => key.startsWith("workout:")).length;

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
              isAuth && userHandle
                ? `
              <p class="text-xs text-zinc-600">@${escapeHtml(userHandle)}</p>
              <div class="flex gap-2 justify-end mt-1">
                <a href="/workout/settings" class="text-xs text-zinc-600 hover:text-black">Settings</a>
                <button id="logout-btn" class="text-xs text-zinc-600 hover:text-black">Logout</button>
              </div>
            `
                : `
              <button id="login-trigger" class="text-xs text-blue-600 hover:text-blue-800 mt-1">Join to track</button>
            `
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="prev-week" ${currentWeek === 1 ? "disabled" : ""}
                  aria-label="Previous week"
                  class="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            ←
          </button>

          <div class="flex-1 bg-zinc-200 h-2 border border-black" role="progressbar" aria-valuenow="${currentWeek}" aria-valuemin="1" aria-valuemax="${totalWeeks}" aria-label="Program progress">
            <div class="bg-green-500 h-full" style="width: ${(currentWeek / totalWeeks) * 100}%"></div>
          </div>

          <button id="next-week" ${currentWeek === totalWeeks ? "disabled" : ""}
                  aria-label="Next week"
                  class="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
            →
          </button>
        </div>
      </div>

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
              completion?.notes,
              userUnit
            );
          })
          .join("")}
      </div>

      <!-- Community Activity Feed -->
      ${activityFeed(activityData, userHandle)}
    </div>

    <!-- Auth and Notes Modals -->
    ${authModal()}
    ${notesModal()}
  `;

  return new Response(
    htmlLayout(
      content,
      `${programData.program.name} - Week ${currentWeek}`,
      { completed: totalCompleted, total: totalWorkouts },
      programData.program.description,
      { weeks: programData.program.weeks, daysPerWeek: programData.program.days_per_week }
    ),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
      },
    }
  );
}
