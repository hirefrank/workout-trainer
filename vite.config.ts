import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig(({ mode }) => ({
  base: '/workout/',
  server: {
    port: 3000,
  },
  plugins: [
    yaml(),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    // Skip cloudflare plugin during tests to avoid authentication requirement
    ...(mode !== 'test' ? [cloudflare({
      configPath: './wrangler.jsonc',
      viteEnvironment: { name: 'ssr' }
    })] : []),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: false,
      },
    }),
    viteReact(),
  ],
  build: {
    rollupOptions: {
      external: ['cloudflare:workers', 'tanstack-start-injected-head-scripts:v', 'node:stream', 'node:stream/web', 'node:async_hooks', 'node:http'],
    },
  },
}));
