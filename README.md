# 💪 Workout Trainer

A progressive kettlebell training program tracker built with TanStack Start and deployed on Cloudflare Workers.

## Features

- **16-Week Progressive Program** - Structured kettlebell training with strategic deload weeks
- **YAML Configuration** - Easily customize exercises and weight classifications
- **Mobile-Optimized** - Brutalist design that works great on phones
- **Simple Tracking** - Mark workouts as complete with basic authentication
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
git clone <your-repo-url>
cd workout-trainer

# Install dependencies
pnpm install

# Create KV namespace
npx wrangler kv:namespace create WORKOUTS_KV

# Update wrangler.jsonc with the KV namespace ID from the output above

# Set authentication password
npx wrangler secret put AUTH_PASSWORD
# Enter your desired password when prompted

# Run development server
pnpm dev
```

Visit http://localhost:3000 to see the app.

### Deployment

```bash
# Build and deploy to Cloudflare Workers
pnpm deploy
```

Your app will be available at `https://workout-trainer.<your-subdomain>.workers.dev`

## Configuration

### Customizing the Program

Edit `src/data/program.yaml` to customize:

1. **Exercise Definitions** - Add or modify exercises with their kettlebell weight classifications:

```yaml
exercises:
  kb-deadlift:
    name: "KB Deadlift"
    type: kettlebell
    bells:
      moderate: 45    # Your moderate weight in lbs
      heavy: 70       # Your heavy weight in lbs
      very_heavy: 88  # Your very heavy weight in lbs
```

2. **Weekly Programming** - The YAML includes weeks 1-2 as examples. Extend it with your full 16-week program following the same structure.

### Authentication

The app uses simple password-based authentication:

- **Viewing**: Public (no auth required)
- **Tracking**: Requires password set via `wrangler secret put AUTH_PASSWORD`

For production use, consider implementing a more robust auth system.

## Architecture

### Tech Stack

- **Framework**: TanStack Start (React 19 + TanStack Router)
- **Runtime**: Cloudflare Workers (edge computing)
- **Storage**: Cloudflare KV (completion tracking)
- **Styling**: Tailwind CSS v4
- **Build**: Vite

### Project Structure

```
src/
├── routes/           # TanStack Router file-based routes
│   ├── __root.tsx   # Root layout
│   └── index.tsx    # Main workout view
├── components/       # React components
│   └── WorkoutCard.tsx
├── server/          # Server functions
│   ├── workouts.ts  # KV operations
│   └── auth.ts      # Authentication
├── data/            # YAML configuration
│   └── program.yaml # Program data
├── lib/             # Utilities
│   ├── utils.ts     # Helper functions
│   └── context.ts   # Cloudflare context helpers
├── types/           # TypeScript types
│   ├── env.ts       # Environment types
│   └── program.ts   # Program data types
└── styles/          # CSS
    └── app.css      # Tailwind imports
```

## Development

### Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm typecheck    # Run TypeScript checks
pnpm preview      # Preview production build
pnpm deploy       # Deploy to Cloudflare Workers
pnpm cf-typegen   # Generate Cloudflare types
```

### Adding New Exercises

1. Add exercise definition to `src/data/program.yaml`:

```yaml
exercises:
  new-exercise:
    name: "New Exercise Name"
    type: kettlebell  # or bodyweight
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
- **Duration-based** - Use `duration` field instead of reps
- **Deload Weeks** - Mark with `is_deload: true`
- **Phase Labels** - Group weeks by training phase

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
      "preview_id": "your-preview-id"
    }
  ]
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
- [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

**Note**: The included YAML file contains weeks 1-2 as examples. You'll need to complete the full 16-week program based on your training plan.
