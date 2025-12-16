---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, security, authentication, tokens]
dependencies: ["002"]
---

# Authentication Token Has No Expiration Enforcement

## Problem Statement

Token generation includes a timestamp, but the timestamp is never validated during verification. Tokens remain valid forever, violating security best practices and enabling long-term unauthorized access.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- Location: `src/server/auth.ts:21` (timestamp added), `src/server/auth.ts:30-46` (not checked)
- Timestamp generated but ignored: `Date.now()` in token
- No expiration validation in `verifyToken()` function
- Confidence score: 88/100

## Code Affected

```typescript
// Line 21 - Timestamp added to token
const token = Buffer.from(`${password}:${Date.now()}`).toString("base64");

// Lines 30-46 - verifyToken function
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const authPassword = getEnvVar("AUTH_PASSWORD");
    if (!authPassword) return false;

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [password] = decoded.split(":");
    // ❌ ISSUE: timestamp is extracted but NEVER CHECKED

    return password === authPassword;
  } catch {
    return false;
  }
};
```

## Security Impact

### 1. Stolen Tokens Valid Forever
- If a token is intercepted/stolen, it works indefinitely
- No way to revoke access without changing master password
- Violates principle of least privilege (time-limited access)

### 2. No Session Management
- Cannot implement "logout" properly
- Cannot force re-authentication
- No automatic session timeout

### 3. Compliance Issues
- Many security standards require session expiration
- Long-lived tokens increase risk window

## Proposed Solutions

### Option 1: Add Expiration Validation (Quick Fix)
- **Pros**: Simple, uses existing timestamp
- **Cons**: Still has issues from #002 (password in token)
- **Effort**: Small (15 minutes)
- **Risk**: Low

```typescript
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const authPassword = getEnvVar("AUTH_PASSWORD");
    if (!authPassword) return false;

    const decoded = atob(token);  // Fixed to use atob
    const [password, timestamp] = decoded.split(":");

    // Validate timestamp
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const MAX_AGE = 24 * 60 * 60 * 1000;  // 24 hours

    if (tokenAge > MAX_AGE) {
      return false;  // Token expired
    }

    return password === authPassword;
  } catch {
    return false;
  }
};
```

### Option 2: HMAC Tokens with Embedded Expiration (Recommended)
- **Pros**: Fixes both #002 and #009, industry standard
- **Cons**: Requires rewriting auth system
- **Effort**: Medium (2 hours)
- **Risk**: Low

```typescript
export const login = createServerFn({ method: "POST" }).handler(
  async ({ password }: { password: string }) => {
    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword || password !== authPassword) {
      throw new Error("Invalid password");
    }

    // Create token with expiration
    const issuedAt = Date.now();
    const expiresAt = issuedAt + (24 * 60 * 60 * 1000);  // 24 hours
    const payload = `${issuedAt}:${expiresAt}`;

    // Sign with HMAC
    const token = await createHMACToken(payload, authPassword);

    return { success: true, token };
  }
);

export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const authPassword = getEnvVar("AUTH_PASSWORD");
    if (!authPassword) return false;

    const payload = await verifyHMACToken(token, authPassword);
    if (!payload) return false;

    const [issuedAt, expiresAt] = payload.split(':').map(Number);

    // Check expiration
    if (Date.now() > expiresAt) {
      return false;  // Token expired
    }

    return true;
  } catch {
    return false;
  }
};
```

## Recommended Action

**Implement Option 2** (HMAC tokens) when fixing #002. This addresses both security issues together.

**Short-term:** Add expiration check to current token system (Option 1)
**Long-term:** Implement proper HMAC tokens (Option 2)

## Technical Details

- **Affected Files**: `src/server/auth.ts`
- **Related Components**: Login, token verification
- **Database Changes**: No
- **Breaking Changes**: Yes - old tokens will be invalidated after expiration period

## Token Expiration Recommendations

### Standard Web App
- Access token: 15 minutes - 1 hour
- Refresh token: 7-30 days

### Personal Workout Tracker (Lower Security)
- Access token: 24 hours
- No refresh token (re-login required)

### High Security
- Access token: 5-15 minutes
- Refresh token: 1-7 days

## Resources

- Code review performed on 2025-12-15
- Related findings: #002 (insecure tokens), #003 (timing attack)
- Agent reports: cloudflare-security-sentinel
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

## Acceptance Criteria

### Short-term (Option 1):
- [ ] Extract timestamp from token
- [ ] Validate timestamp age
- [ ] Return false if token older than 24 hours
- [ ] Test expired tokens are rejected
- [ ] Test fresh tokens are accepted

### Long-term (Option 2):
- [ ] Implement HMAC token signing
- [ ] Embed expiration in token payload
- [ ] Validate HMAC signature
- [ ] Check token expiration
- [ ] All tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified unused timestamp in token generation
- Recognized missing expiration validation
- Categorized as P2 HIGH security issue

**Learnings:**
- Timestamps in tokens are useless without validation
- Token expiration is essential for security
- Long-lived tokens increase attack surface
- Industry best practice: tokens should have short lifetimes

## Notes

This issue is closely related to #002 (insecure token format). Both should be fixed together when implementing proper authentication. The current timestamp in the token is completely unused - it's there but never checked.

**Priority:** P2 HIGH - Should be fixed alongside authentication improvements (#002, #003).

**Dependencies:** Should be fixed as part of #002 (rewriting token system).
