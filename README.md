# 💪 Workout Trainer

A fully customizable workout program tracker deployed on Cloudflare Workers. Includes a complete 16-week progressive kettlebell program as an example.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hirefrank/workout-trainer)

## Features

- **Fully Customizable Program** - Complete control over exercises, weights, sets, reps, and weekly structure via YAML
  - **Supports**: Kettlebell and bodyweight exercises
  - **Flexible**: Sets, reps, duration, supersets, progressive schemes, unilateral exercises
  - **Extensible**: Easy to add new equipment types (barbell, dumbbells, etc.) by extending the schema
- **16-Week Example Program** - Includes a structured kettlebell program with strategic deload weeks (easily adaptable to any KB/bodyweight program)
- **Per-User Customization** - Each user can set their own bell weights while sharing the same program structure
- **Mobile-Optimized** - Brutalist design that works great on phones
- **Multi-User Support** - Handle-based user isolation with individual tracking and settings
- **Video Tutorials** - YouTube links for each exercise with one-click access
- **Public Viewing** - Anyone can view the program, only authenticated users can track
- **No Database Setup** - Uses Cloudflare KV for simple completion tracking

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cloudflare account (free tier works great)

### Installation

```bash
# Clone the repository
git clone https://github.com/hirefrank/workout-trainer.git
cd workout-trainer

# Install dependencies
pnpm install

# Create KV namespace
npx wrangler kv:namespace create WORKOUTS_KV

# Update the kv_namespaces id in wrangler.jsonc with the ID from the output above

# Set authentication password
npx wrangler secret put AUTH_PASSWORD
# Enter your desired password when prompted
```

### Development

```bash
pnpm dev
# Full-stack development with remote bindings
# Uses real KV and secrets via Wrangler's getPlatformProxy()
# Fast hot-reload + full functionality

# Or use local override config (gitignored)
pnpm dev:local
```

Visit http://localhost:3000 to see the app.

**Alternative:** You can also use `wrangler dev` to run in the full Workers runtime environment.

### Deployment

```bash
# Build the application
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy

# Deploy using local override config (gitignored)
pnpm deploy:local
```

Your app will be available at `https://workout-trainer.<your-subdomain>.workers.dev`

## Security

This application has been hardened for Cloudflare Workers with the following security measures:

### Implemented Security Features

✅ **Timing Attack Protection** - Constant-time password comparison prevents timing attacks
✅ **Input Validation** - Zod schemas validate all server function inputs
✅ **Token Expiration** - Authentication tokens expire after 30 days
✅ **KV TTL** - Workout data auto-expires after 6 months
✅ **Workers Runtime Compatible** - Uses Web Standard APIs (no Node.js polyfills)
✅ **Security Headers Middleware** - CSP, X-Frame-Options, HSTS, and more
✅ **CORS Configuration** - Configurable CORS for API endpoints

### Using Security Middleware

The app includes security headers middleware in `src/middleware/security.ts`. To use it in your application:

```typescript
import { addSecurityHeaders } from "~/middleware/security";

// In your fetch handler or middleware:
const response = await fetch(request);
return addSecurityHeaders(response);
```

For CORS configuration:

```typescript
import { addCORSHeaders } from "~/middleware/security";

const corsConfig = {
  allowedOrigins: ["https://yourdomain.com"],
  allowedMethods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};

return addCORSHeaders(request, response, corsConfig);
```

### Production Readiness

**Current Status: ✅ Ready for Personal Use**

The application is production-ready for personal/single-user deployments with:

- ✅ No runtime crashes (Workers-compatible)
- ✅ Secure authentication (timing-attack resistant)
- ✅ Excellent performance (<100ms load times)
- ✅ Automatic data cleanup (6-month TTL)

**For Multi-User/Public Production:**

The application is production-ready! All critical security measures are implemented:

- ✅ HMAC-signed tokens (secure session management)
- ✅ HttpOnly cookies (XSS-resistant token storage)
- ✅ Security headers middleware available
- ✅ CORS configuration available

**Optional Enhancements:**

- Enable Cloudflare Rate Limiting rules (see `docs/RATE_LIMITING.md`)
- Review and tighten CSP directives for your specific use case
- Consider implementing Durable Objects for distributed rate limiting

See `docs/SECURITY_AUDIT.md` for complete security audit details and performance metrics.
See `docs/RATE_LIMITING.md` for rate limiting configuration guide.

## Configuration

### Customizing the Program

**The included program is a complete example - customize everything in `program.yaml`:**

1. **Exercise Definitions** - Add, remove, or modify exercises with their weight classifications:

```yaml
exercises:
  kb-deadlift:
    name: "KB Deadlift"
    type: kettlebell
    bells:
      moderate: 45 # Your moderate weight in lbs
      heavy: 70 # Your heavy weight in lbs
      very_heavy: 88 # Your very heavy weight in lbs
```

2. **Program Structure** - Completely customizable:
   - Number of weeks (default: 16)
   - Days per week (default: 4)
   - Deload weeks
   - Training phases

3. **Weekly Programming** - Define your own workout structure:
   - Which exercises per day
   - Sets and reps
   - Weight progressions
   - Rest periods and notes

**Note:** The YAML file includes a complete 16-week kettlebell program as an example. Use it as-is or adapt it completely to your training goals.

### Authentication

The app uses simple password-based authentication:

- **Viewing**: Public (no auth required)
- **Tracking**: Requires password set via `wrangler secret put AUTH_PASSWORD`

For production use, consider implementing a more robust auth system.

## Architecture

### Tech Stack

- **Runtime**: Cloudflare Workers (edge computing, vanilla fetch handler)
- **Storage**: Cloudflare KV (completion tracking, sessions)
- **Styling**: Tailwind CSS v4 (compiled at build time)
- **Build**: Custom build script (YAML → TypeScript compilation + Tailwind)

### Project Structure

```
src/
├── index.ts          # Worker entry point (fetch handler, routing)
├── handlers/         # API endpoint handlers
│   ├── api.ts       # Authentication (login, logout, checkAuth)
│   └── workouts.ts  # Workout tracking (completions, bells, activity)
├── templates/        # Server-rendered HTML generation
│   ├── layout.ts    # Document wrapper with CSS
│   ├── dashboard.ts # Main workout view
│   ├── settings.ts  # User settings page
│   └── components.ts # Reusable UI components
├── data/            # Generated from program.yaml
│   └── program.ts   # Compiled exercise & week definitions
├── lib/             # Utility functions
│   ├── auth-utils.ts # HMAC signing & verification
│   ├── cookies.ts   # Cookie parsing & creation
│   ├── html.ts      # XSS prevention (escapeHtml)
│   └── schemas.ts   # Zod input validation
├── middleware/       # Security headers middleware
├── types/           # TypeScript interfaces
│   ├── env.ts       # Cloudflare environment types
│   └── program.ts   # Program data types
└── styles/          # CSS
    └── app.css      # Tailwind imports
```

## Development

### Commands

```bash
# Development
pnpm dev          # Dev server with remote bindings (KV + secrets)
pnpm dev:local    # Dev with wrangler.local.jsonc overrides
wrangler dev      # Alternative: Full Workers runtime

# Build and deploy
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript checks
pnpm deploy       # Deploy to Cloudflare Workers
pnpm deploy:local # Deploy with wrangler.local.jsonc overrides
pnpm cf-typegen   # Generate Cloudflare types
```

### Adding New Exercises

1. Add exercise definition to `program.yaml`:

```yaml
exercises:
  new-exercise:
    name: "New Exercise Name"
    type: kettlebell # or bodyweight
    bells:
      moderate: 35
      heavy: 45
      very_heavy: 53
```

2. Reference it in your workout days:

```yaml
- exercise_id: new-exercise
  sets: 5
  reps: 10
  weight: 45
  weight_type: moderate
  notes: "Keep form strict"
```

## What Can You Build?

### Supported Workout Types

The system is designed for **kettlebell and bodyweight programs** with full flexibility:

✅ **Exercise Types**

- Kettlebell exercises (with 3-tier weight system: moderate/heavy/very heavy)
- Bodyweight exercises
- Easy to extend for barbell, dumbbells, bands, machines (just add new types)

✅ **Programming Features**

- Sets × Reps (e.g., `5 × 10`)
- Progressive sets (e.g., `5+4` = 9 sets with weight changes)
- Duration-based exercises (e.g., `20s`, `30-60s`)
- Unilateral exercises (auto "per side" notation for Turkish Getups, Suitcase Marches)
- Progressive reps (e.g., `1-2-4` reps per side)
- Supersets with rounds (auto-grouping in UI)
- Weight types OR explicit weights
- Custom notes per exercise
- YouTube tutorial links

✅ **Program Structure**

- Any number of weeks
- Any days per week
- Deload weeks
- Training phases
- Week-by-week progression

✅ **User Features**

- Per-user weight customization (same program, personalized weights)
- Multi-user support with individual tracking
- Settings page auto-discovers exercises from YAML

### Example Programs You Can Build

- ✅ Kettlebell strength programs (like the included 16-week program)
- ✅ Bodyweight calisthenics programs
- ✅ CrossFit-style WODs (with kettlebells/bodyweight)
- ✅ Hybrid KB + bodyweight programs
- ✅ Home workout programs

### What Would Need Extension

To support other training styles, you'd add:

- Equipment types (barbell, dumbbells, bands, machines, etc.)
- Advanced features (tempo, RPE, AMRAP, rest periods, etc.)

The YAML schema is designed to be easily extensible - adding new equipment types is straightforward.

## Customization

### Styling

The app uses a brutalist design system with Tailwind CSS v4. Customize colors and styling in:

- `src/routes/__root.tsx` - Global layout and header
- `src/components/WorkoutCard.tsx` - Workout card styling
- Add custom CSS to `src/styles/app.css`

### Program Structure

The YAML structure supports:

- **Supersets** - Add notes like "Superset 1 - 3 rounds"
- **Progressive Sets** - Use strings like "1-2-3" for progressive Turkish Getups
- **Progressive Reps** - Use "1-2-4 reps per side" for Turkish Getup progressions
- **Duration-based** - Use `duration` field instead of reps (e.g., "20s", "30-60s")
- **Unilateral exercises** - Auto-detects and shows "per side" notation
- **Deload Weeks** - Mark with `is_deload: true`
- **Phase Labels** - Group weeks by training phase
- **YouTube Links** - Add `youtube_url` to any exercise for tutorial videos

## Cloudflare Setup

### KV Namespace

```bash
# Create production KV
npx wrangler kv:namespace create WORKOUTS_KV

# Create preview KV (for dev)
npx wrangler kv:namespace create WORKOUTS_KV --preview
```

Update `wrangler.jsonc` with the IDs:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "WORKOUTS_KV",
      "id": "your-production-id",
      "preview_id": "your-preview-id",
    },
  ],
}
```

### Secrets

```bash
# Set authentication password
npx wrangler secret put AUTH_PASSWORD
```

## Contributing

Contributions are welcome! This is an MIT-licensed open source project.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with:

- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
