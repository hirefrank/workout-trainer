---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, kv-optimization, storage, cost]
dependencies: []
---

# Missing TTL on KV Writes - Unbounded Storage Growth

## Problem Statement

Workout completion data is written to KV without any TTL (Time-To-Live), causing data to persist indefinitely. This leads to unbounded storage growth, increased costs, and no automatic cleanup of old data.

## Findings

- Discovered during KV optimization review by kv-optimization-specialist agent
- Location: `src/server/workouts.ts:47`
- No expiration set on `kv.put()` calls
- Data accumulates forever with no cleanup mechanism
- After 1 year: ~365 entries (assuming 1 workout/day)
- Confidence score: 95/100

## Code Affected

```typescript
// Line 47 - No TTL specified
await kv.put(key, JSON.stringify(completion));

// This data will persist FOREVER
```

## Impact

### 1. Storage Costs
- Without TTL: Data grows indefinitely
- Storage cost: $0.50 per GB-month
- Example: 1000 workouts × 100 bytes = 100KB (minimal but accumulates)

### 2. No Lifecycle Management
- Past workouts persist forever
- No way to automatically clean up old data
- Manual deletion required (extra operations)

### 3. Operational Overhead
- `unmarkWorkout` requires explicit delete operation
- Delete operations cost the same as writes
- Alternative: Set TTL and let KV auto-expire

## Proposed Solutions

### Option 1: Program Duration TTL (Recommended for Active Programs)
- **Pros**: Keeps data for program duration, auto-cleanup after completion
- **Cons**: Historical data lost after TTL expires
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
// 12-week program = 84 days
// Add 7-day buffer for post-program access
const COMPLETION_TTL = 86400 * 91;  // ~13 weeks in seconds

await kv.put(key, JSON.stringify(completion), {
  expirationTtl: COMPLETION_TTL
});
```

### Option 2: Rolling 6-Month TTL (Recommended for Historical Tracking)
- **Pros**: Keeps reasonable history, automatic cleanup of old data
- **Cons**: Data older than 6 months is lost
- **Effort**: Small (5 minutes)
- **Risk**: Low

```typescript
const SIX_MONTHS_TTL = 86400 * 180;  // 6 months in seconds

await kv.put(key, JSON.stringify(completion), {
  expirationTtl: SIX_MONTHS_TTL
});
```

### Option 3: Versioned Namespacing (For Permanent Storage)
- **Pros**: Keep all historical data, organized by program/year
- **Cons**: More complex, requires manual archival
- **Effort**: Medium (1 hour)
- **Risk**: Low

```typescript
// Use year-based prefixes
const year = new Date().getFullYear();
const key = `workout:${year}:${week}-${day}`;

// Optionally add TTL to old years
const isCurrentYear = year === new Date().getFullYear();
const ttl = isCurrentYear ? undefined : 86400 * 365;  // Archive after 1 year
```

## Recommended Action

**Implement Option 2** (6-month TTL) - balances historical tracking with automatic cleanup. Users can see progress over multiple program cycles while old data auto-expires.

## Technical Details

- **Affected Files**: `src/server/workouts.ts`
- **Related Components**: `markWorkoutComplete` function (line 47)
- **Database Changes**: No (KV namespace stays the same)
- **Breaking Changes**: No (existing data unaffected, new data gets TTL)

## Cost Savings with TTL

**Without TTL:**
- Year 1: 365 entries
- Year 2: 730 entries (cumulative)
- Year 3: 1095 entries (cumulative)
- Storage grows indefinitely

**With 6-month TTL:**
- Maximum: ~180 entries at any time
- Automatic cleanup of old data
- **95% reduction in storage costs** after initial period

## Resources

- Code review performed on 2025-12-15
- Related findings: #006 (sequential KV operations)
- Agent reports: kv-optimization-specialist
- Cloudflare KV TTL docs: https://developers.cloudflare.com/kv/api/write-key-value-pairs/

## Acceptance Criteria

- [ ] Add `expirationTtl` parameter to `kv.put()` in markWorkoutComplete
- [ ] Choose appropriate TTL duration (recommended: 6 months)
- [ ] Document TTL choice in code comments
- [ ] Test that new completions have TTL set
- [ ] Verify old completions still accessible (existing data unaffected)
- [ ] Tests pass
- [ ] Code reviewed

## Work Log

### 2025-12-15 - Code Review Discovery
**By:** Claude Code Review System - KV Optimization Specialist Agent
**Actions:**
- Discovered during comprehensive KV usage analysis
- Identified unbounded storage growth issue
- Categorized as P1 (high impact on costs and operations)

**Learnings:**
- KV data persists forever unless TTL is set
- TTL enables automatic cleanup without manual delete operations
- Appropriate TTL depends on data retention requirements
- Cloudflare KV makes TTL management simple with expirationTtl parameter

## Notes

This is **not a security issue** but a **cost and operational issue**. The fix is trivial (adding one parameter) but has significant long-term impact on storage costs and data hygiene.

**Recommendation:** Implement 6-month TTL to balance historical tracking with automatic cleanup. This allows users to review progress across multiple program cycles while preventing indefinite storage growth.
