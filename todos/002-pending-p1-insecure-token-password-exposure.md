---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, authentication, critical]
dependencies: ["001"]
---

# Insecure Token Generation - Password Embedded in Token

## Problem Statement

Authentication tokens contain the plaintext password encoded in base64, which is **not encryption** - it's trivially reversible. Anyone who intercepts a token can decode it with `atob()` or `Buffer.from()` and obtain the master password.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- Location: `src/server/auth.ts:21`
- Token format: `base64(password:timestamp)`
- Tokens stored in localStorage (accessible to JavaScript)
- Base64 is encoding, not encryption - reversible in milliseconds
- Confidence score: 95/100

## Code Affected

```typescript
// Line 21 - Token contains plaintext password
const token = Buffer.from(`${password}:${Date.now()}`).toString("base64");

// src/routes/index.tsx:53 - Stored in localStorage
localStorage.setItem("authToken", result.token);
```

## Attack Scenario

1. Attacker intercepts any authenticated request (network sniffing, browser DevTools, logs)
2. Extracts token from localStorage or HTTP headers
3. Decodes with `atob(token)` → reveals `password:timestamp`
4. Obtains plaintext AUTH_PASSWORD
5. Complete authentication bypass

## Proposed Solutions

### Option 1: HMAC-Signed Tokens (Recommended)
- **Pros**: Cryptographically secure, industry standard, prevents tampering
- **Cons**: More complex implementation
- **Effort**: Medium (1-2 hours)
- **Risk**: Low

```typescript
// Generate HMAC signature
async function createSignedToken(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );

  const sigHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return btoa(`${data}.${sigHex}`);
}

export const login = createServerFn({ method: "POST" }).handler(
  async ({ password }: { password: string }) => {
    const authPassword = getEnvVar("AUTH_PASSWORD");

    if (!authPassword || password !== authPassword) {
      throw new Error("Invalid password");
    }

    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    const payload = `${Date.now()}:${expiresAt}`;
    const token = await createSignedToken(payload, authPassword);

    return { success: true, token };
  }
);
```

### Option 2: Session IDs with KV Storage
- **Pros**: Most secure, tokens completely opaque, server-side revocation
- **Cons**: Requires KV storage for sessions, more complex
- **Effort**: Large (3-4 hours)
- **Risk**: Low

### Option 3: Accept Current Risk (Not Recommended)
- **Pros**: No code changes needed
- **Cons**: Password exposed to anyone with token access
- **Effort**: None
- **Risk**: HIGH - unacceptable for anything beyond personal use

## Recommended Action

**Implement Option 1** (HMAC-signed tokens) for cryptographic security without the complexity of session storage.

## Technical Details

- **Affected Files**: `src/server/auth.ts`, `src/routes/index.tsx`
- **Related Components**: Login flow, token verification, localStorage storage
- **Database Changes**: No
- **Breaking Changes**: Yes - existing tokens will be invalidated

## Additional Security Improvements Needed

1. **Constant-time password comparison** (prevent timing attacks)
2. **Token expiration enforcement** (currently timestamp is ignored)
3. **HttpOnly cookies instead of localStorage** (prevent XSS token theft)

## Resources

- Code review PR: Initial repository review
- Related findings: #003 (timing attack), #009 (no token expiration)
- Agent reports: cloudflare-security-sentinel
- OWASP Authentication Cheat Sheet

## Acceptance Criteria

- [ ] Implement HMAC signing for token generation
- [ ] Implement HMAC verification for token validation
- [ ] Add token expiration (24 hours recommended)
- [ ] Use constant-time comparison for password check
- [ ] Invalidate all existing tokens (breaking change)
- [ ] Test complete authentication flow
- [ ] Security review passed
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified complete password exposure vulnerability
- Categorized as P1 CRITICAL security issue

**Learnings:**
- Base64 encoding is not encryption
- Tokens should contain opaque identifiers, not secrets
- HMAC signatures prevent token tampering
- Web Crypto API available in Cloudflare Workers

## Notes

This is a **critical security vulnerability**. The current implementation effectively transmits the master password with every authenticated request. For a personal workout tracker, the risk may be acceptable, but for any shared or production use, this must be fixed immediately.

Depends on fixing #001 (Buffer API) first since token generation code will be rewritten.
