---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, security, cors, api]
dependencies: []
---

# Missing CORS Configuration

## Problem Statement

No CORS (Cross-Origin Resource Sharing) headers are configured anywhere in the application. While this may currently work for same-origin requests, it blocks any future API expansion, subdomain usage, or cross-origin access.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- No CORS headers found in codebase (`grep -r "Access-Control|CORS"` returned no matches)
- No OPTIONS request handling detected
- Server functions may fail from different origins
- Confidence score: 82/100

## Current Risk Level

**Low for now** - Application likely serves from single origin
**High for future** - Any API expansion will require CORS

## When CORS Becomes Critical

- Mobile app accessing the API
- Different subdomain (api.workout-trainer.com)
- Development from localhost to production API
- Third-party integrations
- Service worker or PWA implementation

## Proposed Solutions

### Option 1: Add CORS Middleware (Recommended)
- **Pros**: Centralized, handles OPTIONS preflight, configurable origins
- **Cons**: Requires middleware setup
- **Effort**: Medium (30 minutes)
- **Risk**: Low

```typescript
// Create new file: src/middleware/cors.ts
export interface CORSOptions {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

export function addCORSHeaders(
  request: Request,
  response: Response,
  options: CORSOptions
): Response {
  const origin = request.headers.get('Origin');
  const headers = new Headers(response.headers);

  // Check if origin is allowed
  if (origin && options.allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (options.allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    headers.set(
      'Access-Control-Allow-Methods',
      options.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS'
    );

    headers.set(
      'Access-Control-Allow-Headers',
      options.allowedHeaders?.join(', ') || 'Content-Type, Authorization'
    );

    headers.set(
      'Access-Control-Max-Age',
      (options.maxAge || 86400).toString()
    );

    return new Response(null, { status: 204, headers });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Usage in server
const corsOptions: CORSOptions = {
  allowedOrigins: [
    'https://workout-trainer.com',
    'https://www.workout-trainer.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400  // 24 hours
};
```

### Option 2: Simple Permissive CORS (Development Only)
- **Pros**: Very simple
- **Cons**: Not secure for production, allows all origins
- **Effort**: Small (5 minutes)
- **Risk**: HIGH (only for development)

```typescript
// DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
function addCORS(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
```

### Option 3: Configure in Workers (Cloudflare-specific)
- **Pros**: Platform-native approach
- **Cons**: Couples to Cloudflare
- **Effort**: Medium (30 minutes)
- **Risk**: Low

```typescript
// In Workers fetch handler
export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env, ctx);

    // Add CORS headers
    const headers = new Headers(response.headers);
    const origin = request.headers.get('Origin');

    if (origin === 'https://workout-trainer.com') {
      headers.set('Access-Control-Allow-Origin', origin);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
};
```

## Recommended Action

**Implement Option 1** (CORS middleware) - provides proper security with origin validation while maintaining flexibility.

## Technical Details

- **Affected Files**: New middleware file, server entry point
- **Related Components**: All server function responses
- **Database Changes**: No
- **Breaking Changes**: No (additive only)

## CORS Configuration Recommendations

### Allowed Origins (Production)
```typescript
allowedOrigins: [
  'https://workout-trainer.com',
  'https://www.workout-trainer.com'
]
```

### Allowed Origins (Development)
```typescript
allowedOrigins: [
  'https://workout-trainer.com',
  'http://localhost:3000',
  'http://localhost:5173'  // Vite dev server
]
```

### Allowed Methods
```typescript
allowedMethods: ['GET', 'POST', 'OPTIONS']  // Only what's needed
```

## Resources

- Code review performed on 2025-12-15
- Related findings: #007 (missing security headers)
- Agent reports: cloudflare-security-sentinel
- MDN CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Cloudflare CORS: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

## Acceptance Criteria

- [ ] Create CORS middleware
- [ ] Configure allowed origins (production domains)
- [ ] Handle OPTIONS preflight requests
- [ ] Add Access-Control-Allow-Origin header
- [ ] Add Access-Control-Allow-Methods header
- [ ] Add Access-Control-Allow-Headers header
- [ ] Add Access-Control-Max-Age for caching
- [ ] Test cross-origin requests work correctly
- [ ] Verify unauthorized origins are blocked
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified missing CORS configuration
- Categorized as P2 (important for API security)

**Learnings:**
- CORS controls which origins can access your API
- Proper CORS requires preflight (OPTIONS) handling
- Wildcard (*) CORS is insecure and should be avoided in production
- CORS is essential for any API that will be accessed cross-origin

## Notes

**Current Impact:** Low - application likely runs on single origin
**Future Impact:** High - any API expansion will require CORS

This is not urgent for initial deployment but should be implemented before:
- Adding mobile apps
- Supporting subdomains
- Enabling third-party integrations
- Creating a separate API subdomain

**Priority:** P2 - Important for future-proofing but not blocking current development.
