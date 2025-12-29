/**
 * HTML layout wrapper for all pages
 */

import { escapeHtml } from "~/lib/html";

export function htmlLayout(
  content: string,
  title: string,
  footerStats?: { completed: number; total: number },
  description?: string,
  programMeta?: { weeks: number; daysPerWeek: number },
): string {
  const metaDescription =
    description ||
    "Workout program tracker with progress tracking and completion notes";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <meta name="theme-color" content="#000000">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Workout">
  <link rel="manifest" href="/workout/manifest.json">
  <link rel="icon" type="image/x-icon" href="/workout/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="/workout/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="/workout/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/workout/favicon-32x32.png">
  <link rel="apple-touch-icon" href="/workout/apple-touch-icon.png">
  <link rel="stylesheet" href="/workout/styles.css">
  <style>
    body, html {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="min-h-screen bg-zinc-50">
    <header class="bg-white border-b-4 border-black sticky top-0 z-50">
      <div class="container mx-auto max-w-4xl p-4 flex items-center gap-3">
        <span class="bg-black text-white text-2xl px-2 py-1 leading-none">
          W
        </span>
        <h1 class="text-xl font-bold tracking-tight uppercase">
          Workout Trainer
        </h1>
      </div>
    </header>
    <main class="container mx-auto max-w-4xl p-4">
      ${content}

      <!-- Footer - Brutalist -->
      <footer class="mt-8 pt-4 border-t-4 border-black">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p class="text-xs font-bold tracking-wider uppercase">
            ${
              footerStats
                ? `COMPLETED ${footerStats.completed} OUT OF ${footerStats.total} WORKOUTS`
                : programMeta
                  ? `${programMeta.weeks} WEEKS | ${programMeta.daysPerWeek} DAYS/WEEK`
                  : "WORKOUT TRACKER"
            }
          </p>
          <a href="https://github.com/hirefrank/workout-trainer" target="_blank" rel="noopener noreferrer"
             class="px-4 py-2 text-xs font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] uppercase">
            VIEW ON GITHUB &#8599;
          </a>
        </div>
      </footer>
    </main>
  </div>

  <!-- Modals - Outside main content for proper fixed positioning -->
  ${
    content.includes("auth-modal")
      ? ""
      : `
    <div id="auth-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div class="bg-white border-2 border-black p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onclick="event.stopPropagation()">
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

    <div id="notes-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div class="bg-white border-2 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onclick="event.stopPropagation()">
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
  `
  }

  <script src="/workout/app.js"></script>
</body>
</html>`;
}
