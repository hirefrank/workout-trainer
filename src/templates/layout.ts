/**
 * HTML layout wrapper for all pages
 */

import { escapeHtml } from "~/lib/html";

export function htmlLayout(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="16-week progressive kettlebell training program tracker">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💪</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
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
    </main>
  </div>

  <script src="/workout/app.js"></script>
</body>
</html>`;
}
