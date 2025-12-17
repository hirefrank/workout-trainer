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
  handleSubscribe,
  handleGetActivity,
  handleGetBells,
  handleUpdateBells,
  handleResetBells
} from "./handlers/workouts";
import { handleSettings } from "./templates/settings";
import { addSecurityHeaders, addCORSHeaders } from "./middleware/security";

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Strip /workout base path
    const path = url.pathname.replace(/^\/workout/, "") || "/";

    // CORS configuration for API endpoints
    const corsConfig = {
      allowedOrigins: ["https://hirefrank.com", "https://www.hirefrank.com"],
      allowedMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      const response = new Response(null, { status: 204 });
      return addCORSHeaders(request, response, corsConfig);
    }

    try {
      let response: Response;

      // API routes - Authentication
      if (path === "/api/login" && request.method === "POST") {
        response = await handleLogin(request, env);
      } else if (path === "/api/logout" && request.method === "POST") {
        response = await handleLogout(request, env);
      } else if (path === "/api/check-auth" && request.method === "GET") {
        response = await handleCheckAuth(request, env);
      }
      // API routes - Workouts
      else if (path === "/api/completions" && request.method === "GET") {
        response = await handleGetCompletions(request, env);
      } else if (path === "/api/mark-complete" && request.method === "POST") {
        response = await handleMarkComplete(request, env);
      } else if (path === "/api/unmark" && request.method === "POST") {
        response = await handleUnmark(request, env);
      } else if (path === "/api/subscribe" && request.method === "POST") {
        response = await handleSubscribe(request, env);
      } else if (path === "/api/activity" && request.method === "GET") {
        response = await handleGetActivity(request, env);
      }
      // Bells API
      else if (path === "/api/bells" && request.method === "GET") {
        response = await handleGetBells(request, env);
      } else if (path === "/api/bells" && request.method === "POST") {
        response = await handleUpdateBells(request, env);
      } else if (path === "/api/bells" && request.method === "DELETE") {
        response = await handleResetBells(request, env);
      }
      // Settings page
      else if (path === "/settings") {
        response = await handleSettings(request, env);
      }
      // Main dashboard (all other routes)
      else if (path === "/" || path === "") {
        response = await handleDashboard(request, env);
      }
      // 404 for unknown routes
      else {
        response = new Response("Not Found", { status: 404 });
      }

      // Add security headers to all responses
      response = addSecurityHeaders(response);

      // Add CORS headers to API routes
      if (path.startsWith("/api/")) {
        response = addCORSHeaders(request, response, corsConfig);
      }

      return response;

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
