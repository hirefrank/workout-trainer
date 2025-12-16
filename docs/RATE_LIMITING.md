# Rate Limiting Configuration

This guide explains how to configure rate limiting for your Cloudflare Workers application to protect against brute force attacks and DoS.

## Why Rate Limiting?

Rate limiting prevents:
- **Brute Force Attacks**: Limit login attempts to prevent password guessing
- **DoS Attacks**: Prevent resource exhaustion from excessive requests
- **API Abuse**: Protect your Workers from being overwhelmed

## Recommended Configuration

### 1. Cloudflare Rate Limiting Rules (Dashboard)

The easiest approach is to use Cloudflare's built-in Rate Limiting Rules:

1. **Navigate to Dashboard**
   - Go to your Cloudflare Dashboard
   - Select your domain
   - Click "Security" → "WAF" → "Rate limiting rules"

2. **Create Login Protection Rule**
   ```
   Name: Login Brute Force Protection
   If incoming requests match:
     - URI Path equals /api/login
   Then:
     - Rate limit: 5 requests per minute
     - Duration: 60 seconds
     - Action: Block
   ```

3. **Create API Protection Rule**
   ```
   Name: API Rate Limiting
   If incoming requests match:
     - URI Path starts with /api/
   Then:
     - Rate limit: 100 requests per minute
     - Duration: 60 seconds
     - Action: Challenge (CAPTCHA) or Block
   ```

### 2. Workers-Specific Rate Limiting

For more granular control, you can implement rate limiting in your Worker:

#### Option A: Using Durable Objects (Recommended for Production)

Create a Durable Object to track request counts:

```typescript
// src/durable-objects/RateLimiter.ts
export class RateLimiter {
  private state: DurableObjectState;
  private counts: Map<string, { count: number; resetAt: number }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.counts = new Map();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const identifier = url.searchParams.get("identifier") || "anonymous";
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const window = parseInt(url.searchParams.get("window") || "60000"); // 1 minute

    const now = Date.now();
    const entry = this.counts.get(identifier);

    if (!entry || now > entry.resetAt) {
      // New window
      this.counts.set(identifier, { count: 1, resetAt: now + window });
      return new Response(JSON.stringify({ allowed: true, remaining: limit - 1 }));
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return new Response(
        JSON.stringify({
          allowed: false,
          retryAfter: Math.ceil((entry.resetAt - now) / 1000)
        }),
        { status: 429 }
      );
    }

    // Increment count
    entry.count++;
    this.counts.set(identifier, entry);

    return new Response(
      JSON.stringify({ allowed: true, remaining: limit - entry.count })
    );
  }
}
```

#### Option B: Using KV (Simpler, Lower Performance)

For simpler use cases, use KV to track request counts:

```typescript
// src/middleware/rate-limit.ts
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;

  // Get current count
  const countStr = await kv.get(windowKey);
  const count = countStr ? parseInt(countStr) : 0;

  if (count >= limit) {
    const retryAfter = windowSeconds - (now % windowSeconds);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Increment count
  await kv.put(windowKey, (count + 1).toString(), {
    expirationTtl: windowSeconds * 2, // Keep for 2 windows to handle clock skew
  });

  return { allowed: true, remaining: limit - count - 1 };
}

// Usage in server function
import { checkRateLimit } from "~/middleware/rate-limit";
import { getWorkoutsKV } from "~/lib/context";

export const login = createServerFn({ method: "POST" }).handler(
  async (input) => {
    // Get client IP or session identifier
    const clientIP = request.headers.get("CF-Connecting-IP") || "anonymous";

    // Check rate limit
    const rateLimit = await checkRateLimit(getWorkoutsKV(), clientIP, 5, 60);

    if (!rateLimit.allowed) {
      throw new Error(`Too many requests. Retry after ${rateLimit.retryAfter}s`);
    }

    // ... rest of login logic
  }
);
```

### 3. Client IP Identification

Cloudflare provides several headers for identifying clients:

```typescript
// src/lib/context.ts
export function getClientIdentifier(): string {
  const request = getRequest();

  // CF-Connecting-IP: True client IP (most reliable)
  const ip = request.headers.get("CF-Connecting-IP");

  if (ip) {
    return ip;
  }

  // Fallback to other headers
  return (
    request.headers.get("X-Forwarded-For")?.split(",")[0] ||
    request.headers.get("X-Real-IP") ||
    "anonymous"
  );
}
```

## Recommended Limits

### Production Environment

| Endpoint | Rate Limit | Window | Action |
|----------|-----------|--------|---------|
| `/api/login` | 5 requests | 1 minute | Block for 5 minutes |
| `/api/logout` | 10 requests | 1 minute | Block |
| `/api/workouts/*` | 30 requests | 1 minute | Challenge |
| `GET /api/*` (read) | 100 requests | 1 minute | Challenge |
| `POST /api/*` (write) | 30 requests | 1 minute | Block |

### Development Environment

More lenient limits for testing:

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `/api/login` | 20 requests | 1 minute |
| `/api/*` | 1000 requests | 1 minute |

## Testing Rate Limits

Use this script to test your rate limiting:

```bash
#!/bin/bash
# test-rate-limit.sh

ENDPOINT="https://your-app.workers.dev/api/login"
PASSWORD="test"

echo "Testing rate limit on $ENDPOINT"
echo "Sending 10 requests..."

for i in {1..10}; do
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$PASSWORD\"}"
  echo ""
  sleep 1
done
```

Expected output:
- Requests 1-5: `401` (Invalid password) or `200` (Success)
- Requests 6-10: `429` (Too Many Requests)

## Best Practices

1. **Different Limits for Different Endpoints**
   - Stricter limits for authentication endpoints
   - More lenient for read-only operations

2. **Identify Users Properly**
   - Use `CF-Connecting-IP` for anonymous requests
   - Use session ID for authenticated requests
   - Consider both to prevent bypasses

3. **Informative Error Messages**
   ```typescript
   if (!rateLimit.allowed) {
     throw new Error(
       `Too many requests. Please retry after ${rateLimit.retryAfter} seconds.`
     );
   }
   ```

4. **Monitor and Adjust**
   - Start with conservative limits
   - Monitor Cloudflare Analytics for 429 responses
   - Adjust based on legitimate usage patterns

5. **Progressive Delays**
   For critical endpoints like login:
   ```typescript
   const attempts = await getLoginAttempts(clientIP);
   if (attempts > 3) {
     await sleep(Math.min(attempts * 1000, 30000)); // Max 30s delay
   }
   ```

## Cloudflare Dashboard Configuration

### Enable Rate Limiting (Free Tier)

Cloudflare offers basic rate limiting on all plans:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Click **Create rule**
3. Configure as shown in "Recommended Configuration" above
4. Save and deploy

### Advanced Rate Limiting (Paid Plans)

For Pro/Business/Enterprise plans:
- More granular rules
- Custom responses
- Advanced matching criteria
- Bypass options for trusted clients

## Cost Considerations

- **Dashboard Rules**: Free tier includes basic rate limiting
- **Durable Objects**: $0.15/million requests + $0.02/GB memory
- **KV Writes**: $0.50/million writes (reads are free)

For most applications, dashboard rules + KV-based rate limiting provides the best cost/performance balance.

## Implementation Status

✅ **Recommended Actions**:
1. Enable Cloudflare Rate Limiting Rules via dashboard
2. Implement KV-based rate limiting for login endpoint
3. Add client IP identification helpers
4. Test rate limits before production deployment

See `FIXES_APPLIED.md` for tracking of security implementations.
