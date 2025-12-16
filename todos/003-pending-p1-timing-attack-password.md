---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, timing-attack, authentication]
dependencies: []
---

# Timing Attack Vulnerability in Password Comparison

## Problem Statement

Password verification uses JavaScript's `===` operator which performs byte-by-byte comparison and returns early on mismatch. This allows timing attacks where an attacker can determine the correct password character-by-character by measuring response times.

## Findings

- Discovered during security audit by cloudflare-security-sentinel agent
- Location: `src/server/auth.ts:16` and `src/server/auth.ts:42`
- Standard string comparison leaks timing information
- Attacker can reconstruct password through automated timing analysis
- Confidence score: 92/100

## Code Affected

```typescript
// Line 16 - Login check
if (password !== authPassword) {
  throw new Error("Invalid password");
}

// Line 42 - Token verification
return password === authPassword;
```

## Attack Scenario

1. Attacker sends password attempts: "a...", "b...", "c...", etc.
2. Measures response time for each attempt
3. Correct first character takes slightly longer (more bytes compared)
4. Repeats for each character position
5. Eventually reconstructs full password through statistical analysis

**Example:**
- "a..." → 1.2ms (wrong first char, fails immediately)
- "z..." → 1.2ms (wrong first char, fails immediately)
- "p..." → 1.8ms (correct first char, continues to second)
- Now try "pa...", "pb...", "pc..." and repeat

## Proposed Solutions

### Option 1: Constant-Time String Comparison (Recommended)
- **Pros**: Simple, effective, no dependencies
- **Cons**: Slightly more code
- **Effort**: Small (10 minutes)
- **Risk**: Low

```typescript
function constantTimeEqual(a: string, b: string): boolean {
  // Ensure both strings are same length (pad if needed to prevent length leak)
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Usage in login
if (!constantTimeEqual(password, authPassword)) {
  throw new Error("Invalid password");
}

// Usage in verifyToken
return constantTimeEqual(password, authPassword);
```

### Option 2: Use Web Crypto subtle.timingSafeEqual
- **Pros**: Native implementation, guaranteed constant-time
- **Cons**: Not available in all environments, requires Uint8Array conversion
- **Effort**: Small (15 minutes)
- **Risk**: Low

```typescript
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  if (bufA.length !== bufB.length) return false;

  return crypto.subtle.timingSafeEqual(bufA, bufB);
}
```

### Option 3: Add Artificial Delay
- **Pros**: Very simple
- **Cons**: Doesn't eliminate timing attack, just makes it slower. Not recommended.
- **Effort**: Small
- **Risk**: Medium (false sense of security)

## Recommended Action

**Implement Option 1** (constant-time comparison) - simple, effective, no external dependencies.

## Technical Details

- **Affected Files**: `src/server/auth.ts`
- **Related Components**: Login handler, verifyToken function
- **Database Changes**: No
- **Breaking Changes**: No (behavior unchanged, just timing-safe)

## Resources

- Code review performed on 2025-12-15
- Related findings: #002 (insecure tokens)
- Agent reports: cloudflare-security-sentinel
- OWASP: https://owasp.org/www-community/attacks/Timing_attack
- Timing-safe comparison: https://codahale.com/a-lesson-in-timing-attacks/

## Acceptance Criteria

- [ ] Implement constantTimeEqual() function
- [ ] Replace `password !== authPassword` with constantTimeEqual() in login (line 16)
- [ ] Replace `password === authPassword` with constantTimeEqual() in verifyToken (line 42)
- [ ] Verify no timing difference between correct/incorrect passwords
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - Security Sentinel Agent
**Actions:**
- Discovered during comprehensive security audit
- Identified timing attack vulnerability in password comparison
- Categorized as P1 CRITICAL security issue

**Learnings:**
- String equality operators leak timing information
- Constant-time comparison prevents character-by-character password extraction
- Simple XOR-based comparison is sufficient for string equality

## Notes

Timing attacks are practical over the network when measuring many requests. While the password is already exposed in tokens (see #002), fixing this vulnerability is still important for defense-in-depth and will be necessary once token security is improved.

**Priority:** Fix this alongside #002 (insecure tokens) since both relate to authentication security.
