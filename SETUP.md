# Setup Guide

Step-by-step guide to get your Workout Trainer up and running.

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Create Cloudflare KV Namespace

```bash
# Create production KV namespace
npx wrangler kv:namespace create WORKOUTS_KV
```

You'll get output like:
```
{ binding = "WORKOUTS_KV", id = "abc123..." }
```

Create a preview namespace for development:
```bash
npx wrangler kv:namespace create WORKOUTS_KV --preview
```

## 3. Update wrangler.jsonc

Replace the placeholder IDs in `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "WORKOUTS_KV",
      "id": "your-production-id-here",      // ← Replace this
      "preview_id": "your-preview-id-here"   // ← Replace this
    }
  ]
}
```

## 4. Set Up Local Development

Create `.dev.vars` file:
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set your password:
```
AUTH_PASSWORD=mytrainingpassword
```

## 5. Customize Your Program

Edit `src/data/program.yaml`:

1. **Update kettlebell weights** to match your available bells:
```yaml
exercises:
  kb-deadlift:
    name: "KB Deadlift"
    type: kettlebell
    bells:
      moderate: 45    # ← Your actual moderate weight
      heavy: 70       # ← Your actual heavy weight
      very_heavy: 88  # ← Your actual very heavy weight
```

2. **Add remaining weeks** (currently has weeks 1-2 as examples):
   - Follow the existing pattern
   - Copy the structure from your 16-week program
   - Make sure week numbers are sequential (1-16)

## 6. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## 7. Test Authentication

1. Click "Login to track" in the top right
2. Enter the password you set in `.dev.vars`
3. Try marking a workout as complete

## 8. Deploy to Cloudflare Workers

Set production password:
```bash
npx wrangler secret put AUTH_PASSWORD
# Enter your password when prompted
```

Deploy:
```bash
pnpm deploy
```

Your app will be live at: `https://workout-trainer.YOUR-SUBDOMAIN.workers.dev`

## 9. Optional: Custom Domain

In `wrangler.jsonc`, add routes for your custom domain:

```jsonc
{
  "routes": [
    {
      "pattern": "yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

## Troubleshooting

### "KV namespace not found"
- Make sure you updated `wrangler.jsonc` with your actual KV namespace IDs
- Run `npx wrangler kv:namespace list` to see your namespaces

### "Unauthorized" when marking complete
- Check that `.dev.vars` has `AUTH_PASSWORD` set
- For production, make sure you ran `npx wrangler secret put AUTH_PASSWORD`
- Try logging out and back in

### TypeScript errors
- Run `pnpm cf-typegen` to regenerate Cloudflare types
- Make sure you ran `pnpm install`

### Build errors
- Delete `.tanstack` and `node_modules` directories
- Run `pnpm install` again
- Try `pnpm typecheck` to see specific errors

## Next Steps

- Customize the YAML with your full 16-week program
- Adjust styling in `src/routes/__root.tsx` and components
- Add more exercises as needed
- Share with your training partners!
