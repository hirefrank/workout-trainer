---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, security, rate-limiting, dos]
dependencies: []
---

# No Rate Limiting on Endpoints

## Problem Statement

No rate limiting is implemented on any endpoint, allowing unlimited requests to authentication, KV storage, and server functions. This enables brute force attacks, storage abuse, and potential denial of service.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- All endpoints accept unlimited requests
- Login endpoint vulnerable to password guessing
- Workout endpoints vulnerable to KV storage abuse
- No throttling or IP-based limits
- Confidence score: 80/100

## Vulnerable Endpoints

### 1. Login Endpoint (`/api/login`)
- **Risk:** Brute force password attacks
- **Impact:** Unlimited password guessing attempts
- **Recommended limit:** 5 attempts per 15 minutes per IP

### 2. Workout Endpoints
- **Risk:** KV storage abuse, cost inflation
- **Impact:** Unlimited writes to KV namespace
- **Recommended limit:** 100 requests per minute per IP

### 3. Get Completions
- **Risk:** DoS via expensive KV list operations
- **Impact:** Resource exhaustion
- **Recommended limit:** 60 requests per minute per IP

## Attack Scenarios

### 1. Brute Force Attack
```
Attacker script:
for password in password_list:
    POST /api/login {"password": password}
    # No rate limit - try thousands of passwords
```

### 2. KV Storage Abuse
```
for i in range(10000):
    POST /api/markComplete {"week": i, "day": 1, "token": "..."}
    # Fill KV namespace, inflate costs
```

### 3. Resource Exhaustion
```
while True:
    GET /api/completions
    # Trigger expensive KV list() operations repeatedly
```

## Proposed Solutions

### Option 1: Cloudflare Rate Limiting Rules (Recommended)
- **Pros:** Platform-native, no code changes, powerful rules engine
- **Cons:** Requires Cloudflare dashboard configuration or API
- **Effort:** Small (30 minutes)
- **Risk:** Low

```toml
# In wrangler.toml or Cloudflare Dashboard
# Configure rate limiting rules:
# - Login: 5 requests per 15 minutes per IP
# - API: 100 requests per minute per IP
# - Static: 1000 requests per minute per IP
```

### Option 2: Workers KV-Based Rate Limiting
- **Pros:** Granular control, custom logic, free tier friendly
- **Cons:** More code, uses KV storage
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

```typescript
// Create new file: src/middleware/rate-limit.ts
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  kv: KVNamespace
): Promise<boolean> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const count = await kv.get(windowKey);
  const currentCount = count ? parseInt(count, 10) : 0;

  if (currentCount >= limit) {
    return false;  // Rate limit exceeded
  }

  // Increment counter
  await kv.put(windowKey, (currentCount + 1).toString(), {
    expirationTtl: windowSeconds * 2  // Keep for 2 windows
  });

  return true;  // Request allowed
}

// Usage in login
export const login = createServerFn({ method: "POST" }).handler(
  async ({ password }, { request }) => {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const kv = getWorkoutsKV();

    // Check rate limit: 5 attempts per 15 minutes
    const allowed = await checkRateLimit(`login:${ip}`, 5, 900, kv);

    if (!allowed) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    // ... rest of login logic
  }
);
```

### Option 3: In-Memory Rate Limiting (Simple)
- **Pros:** Very simple, no external dependencies
- **Cons:** Lost on Worker restart, not shared across instances
- **Effort:** Small (30 minutes)
- **Risk:** Medium (inconsistent limits)

```typescript
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, {
      count: 1,
      resetAt: now + 15 * 60 * 1000  // 15 minutes
    });
    return true;
  }

  if (record.count >= 5) {
    return false;  // Rate limit exceeded
  }

  record.count++;
  return true;
}
```

## Recommended Action

**Implement Option 1** (Cloudflare Rate Limiting Rules) for simplicity and platform integration.

**Alternative:** Option 2 (KV-based) if you need custom logic or are on free tier.

## Technical Details

- **Affected Files**: All server functions (if implementing Option 2 or 3)
- **Related Components**: Login, workout endpoints
- **Database Changes**: No (uses existing KV or Cloudflare platform)
- **Breaking Changes**: No (just adds limits)

## Rate Limiting Recommendations

### Login Endpoint
- **Limit:** 5 attempts per 15 minutes per IP
- **Action on limit:** Return 429 with retry-after header

### Workout Endpoints (Authenticated)
- **Limit:** 100 requests per minute per user/IP
- **Action on limit:** Return 429

### Read Endpoints (Get Completions)
- **Limit:** 60 requests per minute per IP
- **Action on limit:** Return 429

### Cloudflare Configuration Example
```
Rule 1: Login Rate Limit
- Path: /api/login
- Method: POST
- Limit: 5 requests per 15 minutes
- Per: IP address
- Action: Challenge or Block

Rule 2: API Rate Limit
- Path: /api/*
- Methods: POST, GET
- Limit: 100 requests per minute
- Per: IP address
- Action: Block with 429
```

## Resources

- Code review performed on 2025-12-15
- Related findings: #002 (weak auth), #004 (input validation)
- Agent reports: cloudflare-security-sentinel
- Cloudflare Rate Limiting: https://developers.cloudflare.com/waf/rate-limiting-rules/
- OWASP Rate Limiting: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html

## Acceptance Criteria

### Option 1 (Cloudflare Rules):
- [ ] Configure rate limiting rule for /api/login (5 per 15 min)
- [ ] Configure rate limiting rule for /api/* (100 per min)
- [ ] Test rate limit triggers with rapid requests
- [ ] Verify 429 status code returned when limited
- [ ] Verify Retry-After header present

### Option 2 (KV-based):
- [ ] Implement checkRateLimit function
- [ ] Add rate limiting to login (5 per 15 min)
- [ ] Add rate limiting to workout endpoints (100 per min)
- [ ] Extract IP from CF-Connecting-IP header
- [ ] Return 429 with clear error message
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified missing rate limiting across all endpoints
- Calculated attack scenarios and resource abuse potential
- Categorized as P2 (important security hardening)

**Learnings:**
- Rate limiting is essential for public APIs
- Cloudflare provides platform-level rate limiting
- KV-based rate limiting is simple and effective
- Login endpoints are critical targets for rate limiting

## Notes

Rate limiting is an important defense against:
- Brute force authentication attacks
- Resource exhaustion (DoS)
- Cost inflation through API abuse

For a personal workout tracker with single user, this is lower priority. However, if the app is public or multi-user, rate limiting becomes critical.

**Priority:** P2 - Important for production deployment, especially for authentication endpoints.

**Recommendation:** Start with Cloudflare Rate Limiting Rules (easiest) and add custom logic later if needed.
