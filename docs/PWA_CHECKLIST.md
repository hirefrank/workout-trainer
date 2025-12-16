# PWA Implementation Checklist

## ✅ Completed

### Core Infrastructure
- [x] Created `public/manifest.json` with PWA configuration
- [x] Created `public/workout/sw.js` service worker
- [x] Added PWA meta tags to `src/templates/layout.ts`
- [x] Implemented service worker registration in `public/workout/app.js`
- [x] Added install prompt banner with custom UI
- [x] Implemented push notification subscription logic

### Backend Implementation
- [x] Created `PushSubscriptionSchema` in `src/lib/schemas.ts`
- [x] Implemented `handleSubscribe` endpoint in `src/handlers/workouts.ts`
- [x] Added `/api/subscribe` route to `src/index.ts`
- [x] Push subscriptions stored in KV with 30-day TTL

### Documentation
- [x] Created `docs/PWA_SETUP.md` with complete setup guide
- [x] Created `scripts/generate-vapid-keys.js` for VAPID key generation
- [x] Updated `CLAUDE.md` with PWA section
- [x] Updated `wrangler.jsonc` with secret documentation

### Build System
- [x] Successfully built project with `node build.mjs`
- [x] All TypeScript types validated
- [x] No compilation errors

## 🚧 Remaining Tasks

### Required for Basic PWA
1. **Generate VAPID Keys**
   ```bash
   node scripts/generate-vapid-keys.js
   ```
   - Copy public key to `public/workout/app.js` (line 89)
   - Set private key as Cloudflare secret: `wrangler secret put VAPID_PRIVATE_KEY`

2. **Create PWA Icons**
   - Create `public/workout/icon-192.png` (192x192 pixels)
   - Create `public/workout/icon-512.png` (512x512 pixels)
   - See `docs/PWA_SETUP.md` for icon generation options

3. **Deploy and Test**
   ```bash
   pnpm deploy
   ```
   - Test install prompt on mobile device
   - Verify service worker registration
   - Test push notification subscription

### Optional Enhancements
- [ ] Implement server-side push sending logic
- [ ] Add scheduled cron job for workout reminders
- [ ] Create notification preferences UI
- [ ] Add badge API for unread count
- [ ] Enhance offline support (cache program data)
- [ ] Implement background sync for completions

## 📋 Quick Start

To complete the PWA setup, run these commands in order:

```bash
# 1. Generate VAPID keys
node scripts/generate-vapid-keys.js

# 2. Update public key in app.js (manual step - copy from output)
# Edit public/workout/app.js line 89

# 3. Set Cloudflare secret
wrangler secret put VAPID_PRIVATE_KEY
# Paste private key from step 1

# 4. Create icons (choose one method from docs/PWA_SETUP.md)
# Example using ImageMagick:
convert -size 192x192 xc:white -gravity center -pointsize 140 -annotate +0+0 "💪" public/workout/icon-192.png
convert -size 512x512 xc:white -gravity center -pointsize 380 -annotate +0+0 "💪" public/workout/icon-512.png

# 5. Build and deploy
pnpm build
pnpm deploy
```

## 🧪 Testing

After deployment, test these features:

### Install Prompt (Mobile Only)
- [ ] Visit site on Chrome/Edge mobile
- [ ] Install banner appears at bottom
- [ ] "Install" button triggers native prompt
- [ ] App installs to home screen
- [ ] Opens in standalone mode (no browser UI)

### Service Worker
- [ ] Check DevTools > Application > Service Workers
- [ ] Service worker shows as "activated"
- [ ] Assets cached in Cache Storage
- [ ] Offline mode works (turn off network, reload)

### Push Notifications
- [ ] Log in to app
- [ ] Call `subscribeToPushNotifications()` from console
- [ ] Subscription saved (check network tab for /api/subscribe)
- [ ] Send test push notification (requires server-side implementation)

## 📖 References

- Full setup guide: `docs/PWA_SETUP.md`
- VAPID key generator: `scripts/generate-vapid-keys.js`
- Main config: `CLAUDE.md` (PWA section)
- Wrangler config: `wrangler.jsonc`

## ⚠️ Known Limitations

- Install prompt only works on Chrome/Edge mobile (not Safari)
- iOS requires manual "Add to Home Screen" from Share menu
- Push notifications require iOS 16.4+ and installed PWA
- Service worker requires HTTPS (works on localhost for dev)

## 🎯 Success Criteria

The PWA is fully functional when:
- ✅ Install prompt appears on mobile
- ✅ App can be added to home screen
- ✅ Service worker caches assets
- ✅ App works offline (cached pages)
- ✅ Push notification subscription succeeds
- ✅ App runs in standalone mode
- ✅ Icons display correctly on home screen
