# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A progressive kettlebell training program tracker built with vanilla Cloudflare Workers. The app provides a 16-week structured training program with workout completion tracking, authentication, and optional workout notes.

## Development Commands

```bash
# Development
pnpm dev          # Start wrangler dev server (localhost:8787)
pnpm build        # Compile YAML → TypeScript and Tailwind CSS
pnpm deploy       # Build and deploy to Cloudflare Workers
pnpm typecheck    # Run TypeScript type checking

# Utilities
node scripts/rewrite-titles.mjs  # Regenerate workout titles with training focus
```

## Architecture

### Vanilla Cloudflare Workers

This app runs directly on Cloudflare Workers V8 runtime:

- **No framework**: Direct fetch handler with simple if/else routing
- **Server-rendered HTML**: Template literal strings, no React/JSX
- **Vanilla JavaScript**: Client-side interactivity without frameworks
- **Tailwind CSS**: Compiled CSS served as static asset (no CDN in production)
- **Minimal dependencies**: 7 packages (js-yaml, zod, wrangler, etc.)

### Entry Point

**`src/index.ts`** - Main Worker with fetch handler:
```typescript
export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/workout/, "") || "/";

    // API routes
    if (path === "/api/login" && request.method === "POST")
      return handleLogin(request, env);
    // ... other routes

    // Main dashboard
    if (path === "/" || path === "")
      return handleDashboard(request, env);

    return new Response("Not Found", { status: 404 });
  }
};
```

### Authentication System

HMAC-signed tokens with HttpOnly cookies:

- **Login flow**: `src/handlers/api.ts` - HMAC-SHA256 signatures with Web Crypto API
- **Session storage**: KV namespace stores sessions with 24h TTL
- **Token format**: `sessionId.hmacSignature` (prevents forgery)
- **Cookie utilities**: `src/lib/cookies.ts` - parseCookie, createCookieHeader, deleteCookieHeader
- **HMAC utilities**: `src/lib/auth-utils.ts` - hmacSign, hmacVerify, constantTimeEqual
- **Security**: HttpOnly cookies prevent XSS, constant-time comparison prevents timing attacks

### Data Storage

- **KV Namespace**: Cloudflare KV stores workout completions and sessions
- **Completions**: `workout:${week}-${day}` keys with `{ completedAt, notes? }`
- **TTL**: Workouts expire after 180 days, sessions after 24 hours
- **Parallel operations**: Use `Promise.all()` for multiple KV reads

### HTML Template Generation

**`src/templates/`** - Server-rendered HTML without React:
- **`layout.ts`**: HTML document wrapper with header and compiled Tailwind CSS
- **`dashboard.ts`**: Main workout page with week navigation
- **`components.ts`**: workoutCard, exerciseRow, authModal, notesModal

**XSS Protection**: `src/lib/html.ts` provides `escapeHtml()` for all user input

### Program Configuration

- **YAML-based**: `program.yaml` in root defines exercises and weekly programming
- **Build-time compilation**: `build.mjs` converts YAML → `src/data/program.ts`
- **Type definitions**: `src/types/program.ts` defines ProgramData, Exercise, Week, Day
- **Weight System**: Two-level system
  - Exercise `bells` define reference weights (moderate/heavy/very_heavy)
  - Workouts use `weight_type` to auto-lookup from bells
  - Explicit `weight` field overrides bells definitions
- **Title Generation**: `scripts/rewrite-titles.mjs` generates training-focused titles

### Progressive Web App (PWA)

The app includes full PWA support for mobile installation and push notifications:

- **Web App Manifest**: `public/manifest.json` defines app metadata and icons
- **Service Worker**: `public/workout/sw.js` handles caching and push notifications
  - **DISABLED in development** (`public/workout/app.js`) to prevent caching issues
  - **Enable for production** by uncommenting service worker registration
  - Uses network-first strategy for HTML, cache-first for static assets
  - Bump cache version on each deployment to force updates
- **Install Prompt**: Custom install banner appears on mobile (Chrome/Edge)
- **Push Notifications**: VAPID-based web push for workout reminders
  - Subscriptions stored in KV with `push-sub:${hash}` keys
  - Requires VAPID keys (generate with `scripts/generate-vapid-keys.js`)
  - Subscribe endpoint: `/api/subscribe` in `src/handlers/workouts.ts`
- **Offline Support**: Service worker caches assets for offline access
- **Standalone Mode**: App runs without browser UI when installed

**Setup Required**:
1. Generate VAPID keys: `node scripts/generate-vapid-keys.js`
2. Update public key in `public/workout/app.js`
3. Set private key: `wrangler secret put VAPID_PRIVATE_KEY`
4. Create icon files: `public/workout/icon-192.png` and `icon-512.png`

**Important**: See `docs/SERVICE_WORKER.md` for caching strategy and deployment checklist.
See `docs/PWA_SETUP.md` for complete PWA setup instructions.

### Project Structure

```
src/
├── index.ts                # Main Workers entry (fetch handler, routing)
├── templates/              # HTML generation
│   ├── layout.ts          # Document wrapper with header
│   ├── dashboard.ts       # Main workout page
│   └── components.ts      # workoutCard, authModal, notesModal
├── handlers/               # API endpoints
│   ├── api.ts             # Auth (login, logout, checkAuth)
│   └── workouts.ts        # Workout tracking (mark complete, unmark)
├── lib/                    # Utilities
│   ├── cookies.ts         # Cookie parsing and creation
│   ├── auth-utils.ts      # HMAC signing and verification
│   └── html.ts            # XSS prevention (escapeHtml)
├── data/
│   └── program.ts         # Compiled from program.yaml (generated)
├── types/                  # TypeScript types
│   ├── env.ts             # WorkerEnv interface
│   └── program.ts         # Program data types
└── styles/
    └── app.css            # Tailwind CSS input file

public/
├── manifest.json          # PWA manifest
└── workout/
    ├── app.js             # Vanilla JavaScript (auth, navigation, PWA)
    ├── sw.js              # Service worker (caching, push notifications)
    ├── styles.css         # Compiled Tailwind CSS (generated by build)
    ├── icon-192.png       # PWA icon 192x192 (optional)
    └── icon-512.png       # PWA icon 512x512 (optional)

build.mjs                   # Build script (YAML → TS, Tailwind compilation)
scripts/
└── generate-vapid-keys.js # Generate VAPID keys for push notifications
program.yaml                # Exercise definitions and weekly programming
wrangler.jsonc              # Cloudflare Workers config
```

## Important Patterns

### API Handlers

All handlers accept `Request` and `WorkerEnv` directly:

```typescript
export async function handleLogin(request: Request, env: WorkerEnv): Promise<Response> {
  // 1. Parse and validate
  const body = await request.json();
  const { password } = LoginSchema.parse(body);

  // 2. Check credentials
  if (password !== env.AUTH_PASSWORD) {
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 3. Create session token
  const sessionId = crypto.randomUUID();
  const signature = await hmacSign(sessionId, env.AUTH_PASSWORD);
  const token = `${sessionId}.${signature}`;

  // 4. Store in KV and return cookie
  await env.WORKOUTS_KV.put(`session:${sessionId}`, "active", {
    expirationTtl: 60 * 60 * 24
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": createCookieHeader("auth_token", token)
    }
  });
}
```

### HTML Template Generation

```typescript
export function workoutCard(
  week: number,
  day: Day,
  exercises: Record<string, Exercise>,
  isComplete: boolean,
  canEdit: boolean,
  completionNotes?: string
): string {
  return `
    <div class="workout-card border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isComplete ? "bg-green-100" : ""}">
      <h3>${escapeHtml(day.name)}</h3>
      ${completionNotes ? `<p class="notes">${escapeHtml(completionNotes)}</p>` : ""}
      ${canEdit ? `<button class="complete-btn">Complete</button>` : ""}
    </div>
  `;
}
```

**Always escape user input**: `escapeHtml()` prevents XSS attacks

### Input Validation

All handlers validate input with Zod schemas:

```typescript
import { z } from "zod";

export const WorkoutCompletionWithNotesSchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
  notes: z.string().max(500).optional(),
});
```

### KV Operations

```typescript
// Read completions in parallel
const { keys } = await env.WORKOUTS_KV.list({ prefix: "workout:" });
const values = await Promise.all(keys.map(key => env.WORKOUTS_KV.get(key.name, "json")));

// Write with TTL
await env.WORKOUTS_KV.put(
  `workout:${week}-${day}`,
  JSON.stringify({ completedAt: new Date().toISOString(), notes }),
  { expirationTtl: 60 * 60 * 24 * 180 } // 180 days
);
```

### Client JavaScript

**`public/workout/app.js`** - Vanilla JavaScript for interactivity:

```javascript
// Auth modal
document.getElementById("login-trigger").addEventListener("click", () => {
  document.getElementById("auth-modal").classList.remove("hidden");
});

// Complete workout with optional notes
document.querySelectorAll(".complete-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // Show notes modal
    const modal = document.getElementById("notes-modal");
    modal.classList.remove("hidden");
  });
});

// Full page reload after state changes (simplest approach)
window.location.reload();
```

## Security

- **HMAC-signed tokens**: Prevents token forgery
- **HttpOnly cookies**: Protects against XSS attacks
- **Constant-time comparison**: Prevents timing attacks on password
- **Input validation**: Zod schemas prevent injection attacks
- **HTML escaping**: All user input escaped via `escapeHtml()`
- **Token expiration**: 24-hour session lifetime
- **KV TTL**: Automatic data cleanup

## Cloudflare Setup

### Deployment Configuration

**Base Path**: `/workout/` (configured in wrangler.jsonc)

**Routes**:
- `hirefrank.com/workout*`
- `www.hirefrank.com/workout*`

To deploy to a different domain:
- Update `routes` in `wrangler.jsonc`
- Add `workers_dev: true` for workers.dev deployment

### Environment Variables

Configured in `wrangler.jsonc` under `vars`:
- `REGISTRATION_OPEN`: Controls whether new users can register (`"true"` or `"false"`)
  - Set to `"true"` for open registration
  - Set to `"false"` to require manual user approval
  - Default: `"true"` (configured in wrangler.jsonc)

### Secrets

```bash
# Set authentication password (required)
wrangler secret put AUTH_PASSWORD

# Set VAPID private key for push notifications (optional, for PWA features)
wrangler secret put VAPID_PRIVATE_KEY
# Generate keys with: node scripts/generate-vapid-keys.js
```

### KV Namespace

Configured in `wrangler.jsonc`:
- Binding: `WORKOUTS_KV`
- ID: `cf9e891fc895458883fa2ebb048202fb`

## Customizing the Program

Edit `program.yaml` and run `pnpm build` to recompile:

### Exercise Definitions

```yaml
exercises:
  my-exercise:
    name: "My Exercise Name"
    type: kettlebell  # or bodyweight
    bells:
      moderate: 35
      heavy: 45
      very_heavy: 53
```

### Workout Programming

```yaml
weeks:
  - number: 1
    phase: "Foundation"
    is_deload: false
    days:
      - number: 1
        name: "Volume baseline | Lower Body Strength"
        exercises:
          # Uses bells definition
          - exercise_id: my-exercise
            sets: 5
            reps: 10
            weight_type: heavy     # Auto-uses 45 lbs from bells
            notes: "Optional notes"

          # Overrides bells definition
          - exercise_id: my-exercise
            sets: 5
            reps: 10
            weight: 50             # Custom weight
            notes: "Progressive overload"
```

### Workout Titles

Titles follow format: `Training Focus | Accessory Purpose`

**Training focuses**:
- "Volume baseline" - Week 1 foundation
- "Swing volume +67%" - Major volume increases
- "TGU strength progression" - Weight progressions
- "Recovery & technique" - Deload weeks
- "Strength consolidation" - Volume maintenance

**Accessory purposes**:
- "Lower Body Strength" - Deadlifts + squats
- "Core Stability" - Deadbugs + suitcase march
- "Upper Body Push" - Push-ups
- "Strength Maintenance" - Light accessory work

Regenerate titles: `node scripts/rewrite-titles.mjs`

## Build System

**`build.mjs`** - Orchestrates the build:
1. Reads `program.yaml` with js-yaml
2. Generates typed `src/data/program.ts`
3. Compiles Tailwind CSS to `public/workout/styles.css` (served as static asset)

**Important**: Always run `pnpm build` before deploying to ensure:
- Program data is synced from YAML
- Tailwind CSS is compiled for production use

## Documentation

- `CLAUDE.md` (this file): Development guide
- `CONTRIBUTING.md`: Contribution guidelines
- `docs/SECURITY_AUDIT.md`: Security audit and fixes
- `docs/RATE_LIMITING.md`: Rate limiting implementation guide
- `docs/PROGRAM_REFERENCE.md`: 16-week program reference
- `docs/PWA_SETUP.md`: Progressive Web App setup and configuration
- `docs/SERVICE_WORKER.md`: Service worker caching strategy and troubleshooting
