# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A progressive kettlebell training program tracker built with TanStack Start and deployed on Cloudflare Workers. The app provides a 16-week structured training program with workout completion tracking.

## Development Commands

```bash
# Development
pnpm dev          # Start Vite dev server (localhost:3000)
pnpm typecheck    # Run TypeScript type checking
pnpm build        # Build for production
pnpm preview      # Preview production build locally

# Cloudflare Workers
wrangler dev      # Test with Workers runtime locally
pnpm deploy       # Build and deploy to Cloudflare Workers
pnpm cf-typegen   # Generate Cloudflare types from wrangler.jsonc
```

## Architecture

### Cloudflare Workers Edge Runtime

This app runs on Cloudflare Workers V8 runtime, NOT Node.js:

- **No Node.js APIs**: Use Web Standard APIs only (Web Crypto, fetch, etc.)
- **Global Context Access**: Environment and request are accessed via `Symbol.for("cloudflare:env")` and `Symbol.for("cloudflare:request")`
- **Context Helpers**: Use `src/lib/context.ts` functions (getEnv, getEnvVar, getWorkoutsKV, getRequest, getCookie)
- **No Buffer API**: Use `btoa()`/`atob()` instead of Node.js Buffer

### TanStack Start + TanStack Router

- **File-based routing**: Routes live in `src/routes/` (index.tsx = homepage, __root.tsx = layout)
- **Server functions**: Use `createServerFn()` from `@tanstack/react-start` for server-side logic
- **Type-safe data**: Server functions are automatically typed on the client

### Authentication System

HMAC-signed tokens with HttpOnly cookies and server-side sessions:

- **Login flow**: `src/server/auth.ts` - Uses HMAC-SHA256 signatures with Web Crypto API
- **Session storage**: KV namespace stores sessions with 24h TTL
- **Token format**: `sessionId.hmacSignature` (prevents forgery)
- **Cookie-based auth**: HttpOnly cookies prevent XSS attacks
- **Verification**: `isUserAuthenticated()` checks signature and validates session in KV
- **Security**: Constant-time password comparison prevents timing attacks

### Data Storage

- **KV Namespace**: Cloudflare KV stores workout completions and sessions
- **Binding**: Access via `getWorkoutsKV()` helper function
- **TTL**: All data has expiration (workouts: 180 days, sessions: 24 hours)
- **Parallel operations**: Use `Promise.all()` for multiple KV reads

### Program Configuration

- **YAML-based**: `program.yaml` in root defines exercises and weekly programming
- **Type definitions**: `src/types/program.ts` defines ProgramData, Exercise, Week, Day interfaces
- **Import**: Loaded via `@modyfi/vite-plugin-yaml` as typed object
- **Customization**: Users edit `program.yaml` to customize exercises and weights

### Project Structure

```
src/
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx      # Root layout with header
│   └── index.tsx       # Main workout view (homepage)
├── server/             # Server functions (Cloudflare Workers)
│   ├── auth.ts         # HMAC authentication, HttpOnly cookies
│   ├── workouts.ts     # KV operations for workout completions
│   └── schemas.ts      # Zod validation schemas
├── lib/                # Utilities
│   ├── context.ts      # Cloudflare context helpers (getEnv, getCookie, etc.)
│   └── utils.ts        # UI utilities (cn)
├── types/              # TypeScript types
│   ├── env.ts          # WorkerEnv interface
│   └── program.ts      # Program data types
├── components/         # React components
│   └── WorkoutCard.tsx # Workout display card
└── middleware/         # Optional middleware
    └── security.ts     # Security headers, CORS (not yet integrated)

program.yaml            # Exercise definitions and weekly programming (root)
wrangler.jsonc          # Cloudflare Workers config (KV bindings, secrets)
```

## Important Patterns

### Accessing Cloudflare Environment

```typescript
// ALWAYS use context helpers from src/lib/context.ts
import { getEnv, getEnvVar, getWorkoutsKV, getRequest } from "~/lib/context";

const kv = getWorkoutsKV();              // Get KV namespace
const password = getEnvVar("AUTH_PASSWORD"); // Get secret
const request = getRequest();            // Get current request
```

### Server Functions

```typescript
import { createServerFn } from "@tanstack/react-start";
import { MySchema } from "~/server/schemas";

export const myServerFn = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // 1. Validate input with Zod
    const { field } = MySchema.parse(input);

    // 2. Check authentication
    const isAuth = await isUserAuthenticated();
    if (!isAuth) throw new Error("Unauthorized");

    // 3. Access Cloudflare bindings
    const kv = getWorkoutsKV();

    // 4. Perform operation
    await kv.put(key, value, { expirationTtl: 60 * 60 * 24 });

    return { success: true };
  }
);
```

### Input Validation

All server functions MUST validate input with Zod schemas (see `src/server/schemas.ts`):

```typescript
import { z } from "zod";

export const MySchema = z.object({
  field: z.string().min(1).max(100),
});
```

### KV Operations

```typescript
// ALWAYS use Promise.all() for parallel reads
const keys = ["workout:1-1", "workout:1-2", "workout:1-3"];
const results = await Promise.all(
  keys.map(key => kv.get(key, "json"))
);

// ALWAYS set expirationTtl on writes
await kv.put(key, value, {
  expirationTtl: 60 * 60 * 24 * 180 // 180 days
});
```

### Authentication Cookies

```typescript
import { getCookie, createCookieHeader, deleteCookieHeader } from "~/lib/context";
import { setResponseHeader } from "vinxi/http";

// Read from HttpOnly cookie
const token = getCookie("auth_token");

// Set HttpOnly cookie
setResponseHeader("Set-Cookie", createCookieHeader("auth_token", token, {
  maxAge: 60 * 60 * 24,  // 24 hours
  secure: true,
  sameSite: "Lax"
}));

// Delete cookie (logout)
setResponseHeader("Set-Cookie", deleteCookieHeader("auth_token"));
```

## Security

The application has been hardened for production deployment:

- **HMAC-signed tokens**: Prevents token forgery
- **HttpOnly cookies**: Protects against XSS attacks
- **Constant-time comparison**: Prevents timing attacks on password
- **Input validation**: Zod schemas prevent injection attacks
- **Token expiration**: 24-hour session lifetime
- **KV TTL**: Automatic data cleanup (6 months)
- **Security headers**: Available in `src/middleware/security.ts` (not yet integrated)
- **Rate limiting**: See `docs/RATE_LIMITING.md` for implementation guide

## Cloudflare Setup

### Secrets

```bash
# Set authentication password (required)
wrangler secret put AUTH_PASSWORD
```

### KV Namespace

The KV namespace is already configured in `wrangler.jsonc`:
- Binding: `WORKOUTS_KV`
- ID: `cf9e891fc895458883fa2ebb048202fb`

## Customizing the Program

Edit `program.yaml` to customize exercises and weekly programming:

```yaml
exercises:
  my-exercise:
    name: "My Exercise Name"
    type: kettlebell  # or bodyweight
    bells:
      moderate: 35
      heavy: 45
      very_heavy: 53

weeks:
  - number: 1
    phase: "Foundation"
    is_deload: false
    days:
      - number: 1
        name: "Monday - Power"
        exercises:
          - exercise_id: my-exercise
            sets: 5
            reps: 10
            weight: 45
            weight_type: heavy
            notes: "Optional notes"
```

## Documentation

- `docs/SECURITY_AUDIT.md`: Complete security audit and fixes applied
- `docs/RATE_LIMITING.md`: Rate limiting implementation guide
- `docs/PROGRAM_REFERENCE.md`: 16-week program reference guide
- `CONTRIBUTING.md`: Contribution guidelines
