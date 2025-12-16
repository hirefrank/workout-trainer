---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, security, xss, storage]
dependencies: []
---

# Sensitive Data in localStorage

## Problem Statement

Authentication tokens (which contain the password - see #002) are stored in localStorage, making them accessible to all JavaScript on the same origin and vulnerable to XSS attacks.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- Location: `src/routes/index.tsx:31-34` (read), `src/routes/index.tsx:52-53` (write)
- Tokens stored in localStorage: `localStorage.setItem("authToken", token)`
- localStorage accessible to any JavaScript (including XSS payloads)
- Tokens persist across browser sessions
- Confidence score: 80/100

## Code Affected

```typescript
// Line 31-34 - Reading token from localStorage
const stored = localStorage.getItem("authToken");
if (stored) {
  setAuthToken(stored);
}

// Line 52-53 - Writing token to localStorage
localStorage.setItem("authToken", result.token);
```

## Security Impact

### 1. XSS Vulnerability
- Any XSS attack can steal tokens: `localStorage.getItem("authToken")`
- Tokens exfiltrated to attacker server
- Combined with #002 (password in token) = complete account compromise

### 2. Persistence Concerns
- Tokens persist across sessions (never cleared)
- Remains in browser even after tab/window closed
- Increases exposure window

### 3. Cross-Tab Access
- Token accessible from any tab on same origin
- Malicious browser extension can read it
- Service worker can access it

## Proposed Solutions

### Option 1: HttpOnly Cookies (Most Secure - Recommended)
- **Pros**: Inaccessible to JavaScript, XSS-proof, automatic CSRF protection
- **Cons**: Requires server-side cookie setting, CORS considerations
- **Effort**: Medium (1-2 hours)
- **Risk**: Low

```typescript
// Server-side (src/server/auth.ts)
export const login = createServerFn({ method: "POST" }).handler(
  async ({ password }: { password: string }, { context }) => {
    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword || password !== authPassword) {
      throw new Error("Invalid password");
    }

    const token = await createSecureToken();  // From #002 fix

    // Set HttpOnly cookie
    context.response.headers.set(
      'Set-Cookie',
      `authToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
    );

    return { success: true };
  }
);

// Client-side - token automatically sent with requests, no JS access needed
```

### Option 2: sessionStorage Instead of localStorage
- **Pros**: Cleared when tab closes, simple migration
- **Cons**: Still accessible to XSS, requires re-login per tab
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
// Just replace localStorage with sessionStorage
sessionStorage.setItem("authToken", result.token);
const stored = sessionStorage.getItem("authToken");
```

### Option 3: In-Memory Storage Only
- **Pros**: Most secure for client-side, XSS can only steal during lifetime
- **Cons**: Lost on page refresh (re-login required), poor UX
- **Effort**: Small (10 minutes)
- **Risk**: Low

```typescript
// Global state (React context or similar)
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// No persistence - user must re-login on page refresh
```

## Recommended Action

**Implement Option 1** (HttpOnly cookies) when fixing authentication (#002). This provides best security against XSS.

**Short-term workaround:** Switch to sessionStorage (Option 2) for slightly better security than localStorage.

## Technical Details

- **Affected Files**: `src/routes/index.tsx`, `src/server/auth.ts` (for cookie setting)
- **Related Components**: Login flow, authentication state
- **Database Changes**: No
- **Breaking Changes**: Yes - users will need to re-login

## Storage Comparison

| Storage | XSS Access | Persists | Auto-Sent | Secure |
|---------|------------|----------|-----------|--------|
| **localStorage** | ✅ Yes | Forever | No | ❌ Least |
| **sessionStorage** | ✅ Yes | Tab session | No | ❌ Low |
| **In-Memory** | ✅ Yes | Page load | No | ⚠️ Medium |
| **HttpOnly Cookie** | ❌ No | Configurable | Yes | ✅ Best |

## Resources

- Code review performed on 2025-12-15
- Related findings: #002 (password in token), XSS prevention
- Agent reports: cloudflare-security-sentinel
- OWASP Token Storage: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side

## Acceptance Criteria

### Long-term (Option 1 - Recommended):
- [ ] Implement server-side cookie setting in login
- [ ] Set HttpOnly, Secure, SameSite=Strict flags
- [ ] Remove localStorage.setItem/getItem calls
- [ ] Token automatically sent with server function requests
- [ ] Test authentication flow works with cookies
- [ ] Verify cookies not accessible from JavaScript
- [ ] Tests pass
- [ ] Code reviewed

### Short-term (Option 2 - Quick Fix):
- [ ] Replace localStorage with sessionStorage
- [ ] Test auth persists within tab session
- [ ] Verify cleared when tab closes

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified token storage in localStorage
- Combined with #002, creates critical vulnerability
- Categorized as P2 HIGH security issue

**Learnings:**
- localStorage is accessible to XSS attacks
- HttpOnly cookies prevent JavaScript access
- Token storage location is critical for security
- Modern web apps should use HttpOnly cookies for auth tokens

## Notes

This issue compounds the severity of #002 (password in token). The combination means:
1. Token contains plaintext password
2. Token stored in localStorage (accessible to XSS)
3. Any XSS vulnerability = password theft

**Priority:** P2 HIGH - Should be fixed alongside authentication improvements (#002).

For a personal workout tracker, localStorage might be acceptable risk, but for any shared or production use, HttpOnly cookies are strongly recommended.
