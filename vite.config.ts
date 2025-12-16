import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@modyfi/vite-plugin-yaml";
import type { Plugin } from "vite";

// Cloudflare bindings plugin for dev mode
function cloudflareBindings(): Plugin {
  return {
    name: "cloudflare-bindings",
    async configureServer(server) {
      const { getPlatformProxy } = await import("wrangler");
      const { env, dispose } = await getPlatformProxy();

      // Make Cloudflare env available globally during dev
      (globalThis as any).__cloudflareEnv = env;

      server.httpServer?.on("close", () => {
        dispose();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ["lucide-react", "@tanstack/react-router"],
  },
  plugins: [
    yaml(),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    cloudflareBindings(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: false,
      },
    }),
    viteReact(),
  ],
});
