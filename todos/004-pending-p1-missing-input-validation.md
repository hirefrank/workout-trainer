---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, security, input-validation, server-functions]
dependencies: []
---

# Missing Input Validation on Server Functions

## Problem Statement

Despite having Zod in package.json, no runtime validation is performed on server function input parameters. TypeScript types are erased at runtime, leaving the application vulnerable to type confusion, injection attacks, and DoS.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- Locations: All server functions in `src/server/workouts.ts` and `src/server/auth.ts`
- Zod dependency present but unused in src/
- TypeScript provides no runtime protection
- Confidence score: 88/100

## Code Affected

```typescript
// src/server/workouts.ts:30-31
export const markWorkoutComplete = createServerFn({ method: "POST" }).handler(
  async ({ week, day, token }: { week: number; day: number; token: string }) => {
    // No validation! week/day could be strings, objects, undefined, etc.
    const key = `workout:${week}-${day}`;  // Potential injection
  }
);
```

## Attack Scenarios

### 1. Type Confusion
```javascript
// Attacker sends:
{ week: "1; DROP TABLE", day: 1, token: "..." }

// Creates KV key:
"workout:1; DROP TABLE-1"
```

### 2. KV Key Injection
```javascript
// Attacker sends:
{ week: "../admin", day: "secrets", token: "..." }

// Creates KV key:
"workout:../admin-secrets"  // Escapes workout: namespace
```

### 3. Denial of Service
```javascript
// Attacker sends:
{ week: Number.MAX_SAFE_INTEGER, day: "x".repeat(1000000), token: "..." }

// Causes excessive memory usage or key size errors
```

## Proposed Solutions

### Option 1: Add Zod Validation Schemas (Recommended)
- **Pros**: Runtime type safety, clear error messages, reusable schemas
- **Cons**: Requires adding validation code
- **Effort**: Medium (1 hour for all server functions)
- **Risk**: Low

```typescript
// src/server/schemas.ts
import { z } from "zod";

export const WorkoutCompletionSchema = z.object({
  week: z.number().int().min(1).max(16),
  day: z.number().int().min(1).max(7),
  token: z.string().min(1).max(500)
});

export const LoginSchema = z.object({
  password: z.string().min(1).max(100)
});

// src/server/workouts.ts
import { WorkoutCompletionSchema } from "./schemas";

export const markWorkoutComplete = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // Validate input
    const { week, day, token } = WorkoutCompletionSchema.parse(input);

    // Now week and day are guaranteed to be valid integers
    const { verifyToken } = await import("~/server/auth");
    const isValid = await verifyToken(token);

    if (!isValid) {
      throw new Error("Unauthorized");
    }

    const kv = getWorkoutsKV();
    const key = `workout:${week}-${day}`;

    // ... rest of logic
  }
);
```

### Option 2: Manual Validation
- **Pros**: No additional validation library needed
- **Cons**: More code, less maintainable, easy to miss cases
- **Effort**: Medium (1-2 hours)
- **Risk**: Medium (easy to make mistakes)

```typescript
function validateWorkoutInput(input: any): { week: number; day: number; token: string } {
  if (typeof input.week !== 'number' || !Number.isInteger(input.week) ||
      input.week < 1 || input.week > 16) {
    throw new Error('Invalid week');
  }

  if (typeof input.day !== 'number' || !Number.isInteger(input.day) ||
      input.day < 1 || input.day > 7) {
    throw new Error('Invalid day');
  }

  if (typeof input.token !== 'string' || input.token.length === 0 ||
      input.token.length > 500) {
    throw new Error('Invalid token');
  }

  return { week: input.week, day: input.day, token: input.token };
}
```

## Recommended Action

**Implement Option 1** (Zod schemas) - leverages existing dependency, provides type safety, and gives clear error messages.

## Technical Details

- **Affected Files**:
  - `src/server/workouts.ts` (4 functions)
  - `src/server/auth.ts` (1 function)
- **Related Components**: All createServerFn handlers
- **Database Changes**: No
- **Breaking Changes**: No (validation failures return 400 errors)

## Server Functions Requiring Validation

1. `markWorkoutComplete` - validate week (1-16), day (1-7), token (string)
2. `unmarkWorkout` - validate week (1-16), day (1-7), token (string)
3. `isWorkoutComplete` - validate week (1-16), day (1-7)
4. `getCompletedWorkouts` - no inputs (safe)
5. `login` - validate password (string, max length)

## Resources

- Code review performed on 2025-12-15
- Related findings: None (independent security issue)
- Agent reports: cloudflare-security-sentinel
- Zod documentation: https://zod.dev/
- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

## Acceptance Criteria

- [ ] Create Zod schemas for all server function inputs
- [ ] Add validation to markWorkoutComplete
- [ ] Add validation to unmarkWorkout
- [ ] Add validation to isWorkoutComplete
- [ ] Add validation to login
- [ ] Test with invalid inputs (should return 400 errors with clear messages)
- [ ] Test with valid inputs (should work as before)
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified missing runtime validation despite Zod dependency
- Categorized as P1 CRITICAL security issue

**Learnings:**
- TypeScript types don't exist at runtime
- Runtime validation is essential for server-side code
- Zod provides both runtime validation and TypeScript type inference
- Input validation prevents injection, DoS, and type confusion attacks

## Notes

This is a **critical security gap**. The application trusts all client input without validation. While the current UI only sends valid data, a malicious client could send arbitrary values. This is especially important for preventing:
- KV key injection (arbitrary key creation)
- Type confusion (strings instead of numbers)
- Resource exhaustion (huge strings/numbers)

Zod is already in package.json, so adding validation schemas is straightforward and adds no new dependencies.
