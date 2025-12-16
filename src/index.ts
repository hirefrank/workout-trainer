/**
 * Workout Trainer - Cloudflare Worker
 *
 * Vanilla Workers implementation with server-rendered HTML
 */

import type { WorkerEnv } from "./types/env";
import { handleDashboard } from "./templates/dashboard";
import {
  handleLogin,
  handleLogout,
  handleCheckAuth
} from "./handlers/api";
import {
  handleGetCompletions,
  handleMarkComplete,
  handleUnmark,
  handleSubscribe
} from "./handlers/workouts";

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Strip /workout base path
    const path = url.pathname.replace(/^\/workout/, "") || "/";

    try {
      // API routes - Authentication
      if (path === "/api/login" && request.method === "POST") {
        return await handleLogin(request, env);
      }

      if (path === "/api/logout" && request.method === "POST") {
        return await handleLogout(request, env);
      }

      if (path === "/api/check-auth" && request.method === "GET") {
        return await handleCheckAuth(request, env);
      }

      // API routes - Workouts
      if (path === "/api/completions" && request.method === "GET") {
        return await handleGetCompletions(request, env);
      }

      if (path === "/api/mark-complete" && request.method === "POST") {
        return await handleMarkComplete(request, env);
      }

      if (path === "/api/unmark" && request.method === "POST") {
        return await handleUnmark(request, env);
      }

      if (path === "/api/subscribe" && request.method === "POST") {
        return await handleSubscribe(request, env);
      }

      // Main dashboard (all other routes)
      if (path === "/" || path === "") {
        return await handleDashboard(request, env);
      }

      // 404 for unknown routes
      return new Response("Not Found", { status: 404 });

    } catch (error) {
      console.error("Error handling request:", error);

      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
