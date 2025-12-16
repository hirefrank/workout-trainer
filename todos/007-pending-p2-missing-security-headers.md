---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, security, headers, clickjacking]
dependencies: []
---

# Missing Security Headers

## Problem Statement

The application serves HTML without security headers, leaving it vulnerable to clickjacking, XSS attacks, MIME type confusion, and other browser-based attacks.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- No security headers found in codebase
- No Content-Security-Policy (CSP)
- No X-Frame-Options (clickjacking protection)
- No X-Content-Type-Options (MIME sniffing protection)
- Confidence score: 85/100

## Missing Headers

### 1. Content-Security-Policy
**Impact:** No protection against XSS attacks via inline scripts
**Risk:** High

### 2. X-Frame-Options
**Impact:** Application can be embedded in malicious iframes (clickjacking)
**Risk:** Medium

### 3. X-Content-Type-Options
**Impact:** Browsers may misinterpret file types (MIME confusion attacks)
**Risk:** Low

### 4. Referrer-Policy
**Impact:** Referrer information may leak to third parties
**Risk:** Low

### 5. Permissions-Policy
**Impact:** No control over browser features (camera, microphone, etc.)
**Risk:** Low

## Proposed Solutions

### Option 1: Add Headers via Middleware (Recommended)
- **Pros**: Centralized, applies to all responses, easy to maintain
- **Cons**: Requires understanding Tanstack Start middleware
- **Effort**: Medium (30-45 minutes)
- **Risk**: Low

```typescript
// Create new file: src/middleware/security-headers.ts
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy (strict)
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Allow inline scripts for React
      "style-src 'self' 'unsafe-inline'",   // Allow inline styles for Tailwind
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Apply in root route or server entry point
```

### Option 2: Add Headers in wrangler.toml (Alternative)
- **Pros**: Configuration-based, no code changes
- **Cons**: Less flexible, harder to customize per-route
- **Effort**: Small (15 minutes)
- **Risk**: Low

```toml
# In wrangler.toml (if using Workers Sites)
[site]
bucket = "./dist/client"

[[headers]]
request.method = ["GET"]
response.set."X-Frame-Options" = "DENY"
response.set."X-Content-Type-Options" = "nosniff"
response.set."Referrer-Policy" = "strict-origin-when-cross-origin"
```

## Recommended Action

**Implement Option 1** (middleware) for full control and flexibility with security headers.

## Technical Details

- **Affected Files**: New file `src/middleware/security-headers.ts`, integration point in server/router
- **Related Components**: All HTTP responses
- **Database Changes**: No
- **Breaking Changes**: No (headers added, behavior unchanged)

## Security Header Recommendations

### Strict CSP (Production)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; style-src 'self'; frame-ancestors 'none'
```

### Development-Friendly CSP
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'
```

## Resources

- Code review performed on 2025-12-15
- Related findings: #008 (missing CORS)
- Agent reports: cloudflare-security-sentinel
- OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
- MDN Security Headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security

## Acceptance Criteria

- [ ] Create security headers middleware
- [ ] Add X-Frame-Options: DENY
- [ ] Add X-Content-Type-Options: nosniff
- [ ] Add Content-Security-Policy (appropriate for React/Tailwind)
- [ ] Add Referrer-Policy
- [ ] Add Permissions-Policy
- [ ] Test all pages load correctly with headers
- [ ] Verify headers present in browser DevTools (Network tab)
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified missing security headers across all responses
- Categorized as P2 (important security hardening)

**Learnings:**
- Security headers are essential defense-in-depth
- CSP prevents many XSS attacks
- X-Frame-Options prevents clickjacking
- Modern web applications should have comprehensive security headers

## Notes

While not as critical as authentication issues, security headers provide important defense-in-depth protection. They're especially important for preventing:
- Clickjacking (X-Frame-Options)
- XSS via inline scripts (CSP)
- MIME confusion attacks (X-Content-Type-Options)

**Priority:** P2 - Should be added before production deployment but not blocking immediate development.
