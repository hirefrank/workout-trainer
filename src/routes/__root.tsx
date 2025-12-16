import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💪</text></svg>" },
    ],
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "A fully customizable workout program tracker with a complete 16-week progressive kettlebell training program. Built with TanStack Start and Cloudflare Workers.",
      },
      { name: "theme-color", content: "#000000" },

      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Workout Trainer - Customizable Kettlebell Program Tracker" },
      {
        property: "og:description",
        content: "Track your workout progress with a fully customizable program tracker. Includes a complete 16-week progressive kettlebell program with strategic deload weeks.",
      },
      { property: "og:site_name", content: "Workout Trainer" },
      // TODO: Add og:url with your deployed URL
      // { property: "og:url", content: "https://your-domain.com" },
      // TODO: Add og:image with a social media card (1200x630px recommended)
      // { property: "og:image", content: "https://your-domain.com/og-image.png" },
      // { property: "og:image:width", content: "1200" },
      // { property: "og:image:height", content: "630" },
      // { property: "og:image:alt", content: "Workout Trainer - Kettlebell Program" },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Workout Trainer - Customizable Kettlebell Program Tracker" },
      {
        name: "twitter:description",
        content: "Track your workout progress with a fully customizable program tracker. Includes a complete 16-week progressive kettlebell program with strategic deload weeks.",
      },
      // TODO: Add twitter:image (same as og:image)
      // { name: "twitter:image", content: "https://your-domain.com/og-image.png" },
      // { name: "twitter:image:alt", content: "Workout Trainer - Kettlebell Program" },

      // Additional meta
      { name: "author", content: "Workout Trainer" },
      { name: "keywords", content: "workout tracker, kettlebell training, progressive program, fitness app, strength training, workout planner" },
    ],
    title: "Workout Trainer",
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <div className="min-h-screen bg-zinc-50">
        <header className="bg-black text-white p-4 sticky top-0 z-50">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-xl font-bold">💪 Workout Trainer</h1>
          </div>
        </header>
        <main className="container mx-auto max-w-4xl p-4">
          <Outlet />
        </main>
      </div>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
