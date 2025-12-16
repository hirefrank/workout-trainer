# PWA Setup Guide

This guide covers the complete setup of Progressive Web App (PWA) features for Workout Trainer, including install prompts and push notifications.

## Features Implemented

1. **PWA Install Prompt**: Custom install banner appears on mobile devices
2. **Push Notifications**: Server-to-client push notifications for workout reminders
3. **Service Worker**: Offline caching and background notification handling
4. **Web App Manifest**: Defines app metadata, icons, and display mode

## Setup Steps

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them using the provided script:

```bash
node scripts/generate-vapid-keys.js
```

This will output:
- **Public Key**: For client-side code
- **Private Key**: For server-side code (Cloudflare secret)

### 2. Update Client-Side Code

Replace the placeholder VAPID public key in `public/workout/app.js`:

```javascript
// Find this line (around line 89):
applicationServerKey: urlBase64ToUint8Array(
  'YOUR_VAPID_PUBLIC_KEY_HERE'
)

// Replace with your generated public key:
applicationServerKey: urlBase64ToUint8Array(
  'BNg...' // Your actual public key
)
```

### 3. Set Cloudflare Secrets

Store the VAPID private key as a Cloudflare secret:

```bash
wrangler secret put VAPID_PRIVATE_KEY
# Paste the private key when prompted
```

### 4. Create PWA Icons

The manifest references two icon files that need to be created:

- `public/workout/icon-192.png` (192x192 pixels)
- `public/workout/icon-512.png` (512x512 pixels)

**Icon Requirements**:
- PNG format
- Square dimensions (192x192 and 512x512)
- Simple, recognizable design (e.g., kettlebell emoji or custom logo)
- Works well on both light and dark backgrounds (use padding)

**Quick Icon Generation Options**:

**Option 1: Use an emoji** (simplest)
```bash
# Install ImageMagick
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick          # macOS

# Generate 192x192 icon
convert -size 192x192 xc:white -gravity center -pointsize 140 -annotate +0+0 "💪" public/workout/icon-192.png

# Generate 512x512 icon
convert -size 512x512 xc:white -gravity center -pointsize 380 -annotate +0+0 "💪" public/workout/icon-512.png
```

**Option 2: Use an online tool**
- Visit [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
- Upload a logo or generate from text
- Download and rename to `icon-192.png` and `icon-512.png`

**Option 3: Use Figma/design tool**
- Create 192x192 and 512x512 artboards
- Design your icon (simple is better for mobile)
- Export as PNG

### 5. Test Installation

**Test on Mobile Device**:

1. Deploy the app: `pnpm deploy`
2. Visit the site on your phone
3. You should see an install banner at the bottom
4. Tap "Install" to add to home screen
5. The app should open in standalone mode (no browser UI)

**Test Install Prompt Manually**:
```javascript
// In browser console on desktop (Chrome DevTools):
// 1. Open DevTools > Application > Manifest
// 2. Click "Add to home screen" button
// 3. Should see install prompt
```

### 6. Test Push Notifications

**Prerequisites**:
- User must be authenticated (logged in)
- User must grant notification permission
- User must be subscribed to push notifications

**Test Flow**:

1. Log in to the app
2. Call the subscription function from browser console:
   ```javascript
   // Request permission
   await requestNotificationPermission();

   // Subscribe to push
   await subscribeToPushNotifications();
   ```
3. Check that subscription was saved (check browser console for success)
4. Send a test push notification (see "Sending Push Notifications" below)

## Sending Push Notifications

To send push notifications, you'll need to implement a server-side function that:

1. Retrieves all push subscriptions from KV
2. Uses the VAPID private key to sign requests
3. Sends notifications via Web Push Protocol

**Example Implementation** (using `web-push` library):

```typescript
import webpush from 'web-push';

// Set VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

// Send notification to all subscribers
async function sendPushNotifications(env: WorkerEnv, message: any) {
  // Get all subscriptions from KV
  const { keys } = await env.WORKOUTS_KV.list({ prefix: 'push-sub:' });
  const subscriptions = await Promise.all(
    keys.map(key => env.WORKOUTS_KV.get(key.name, 'json'))
  );

  // Send to each subscriber
  const results = await Promise.all(
    subscriptions.map(subscription =>
      webpush.sendNotification(subscription, JSON.stringify(message))
        .catch(err => console.error('Push failed:', err))
    )
  );

  return results;
}
```

**Note**: The `web-push` npm package may not work directly in Cloudflare Workers due to Node.js dependencies. You'll need to either:
- Implement the Web Push Protocol manually using Web Crypto API
- Use a Cloudflare Worker scheduled cron job with a compatible library
- Send notifications from a separate Node.js server

## Troubleshooting

### Install Prompt Doesn't Appear

**Possible causes**:
1. Already installed (check home screen)
2. Not using HTTPS (PWAs require secure context)
3. Browser doesn't support `beforeinstallprompt` (Safari doesn't support it)
4. Manifest file has errors (check DevTools > Application > Manifest)

**Solutions**:
- Check Chrome DevTools > Application > Manifest for errors
- Ensure manifest.json is served with correct MIME type
- Test in Chrome/Edge on Android (best PWA support)

### Push Notifications Not Working

**Possible causes**:
1. VAPID keys not set correctly
2. User hasn't granted notification permission
3. Service worker not registered
4. Subscription not saved to server

**Solutions**:
- Check browser console for errors
- Verify VAPID keys are correct (public key in app.js, private key in secrets)
- Check DevTools > Application > Service Workers (should show registered)
- Check DevTools > Application > Storage > Cache Storage (should have cached assets)

### Icons Not Displaying

**Possible causes**:
1. Icon files don't exist at specified paths
2. Incorrect file format or dimensions
3. Manifest not properly linked

**Solutions**:
- Verify files exist at `public/workout/icon-192.png` and `public/workout/icon-512.png`
- Check file dimensions match manifest (192x192 and 512x512)
- Verify manifest link in `<head>` of HTML

## File Structure

```
public/
├── manifest.json                 # PWA manifest
└── workout/
    ├── sw.js                    # Service worker
    ├── app.js                   # Client-side JavaScript (includes PWA logic)
    ├── icon-192.png             # App icon (192x192) - TO BE CREATED
    └── icon-512.png             # App icon (512x512) - TO BE CREATED

src/
├── handlers/
│   └── workouts.ts              # Includes handleSubscribe endpoint
├── lib/
│   └── schemas.ts               # Includes PushSubscriptionSchema
└── templates/
    └── layout.ts                # Includes PWA meta tags

scripts/
└── generate-vapid-keys.js       # VAPID key generator
```

## Browser Support

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| Install Prompt | ✅ | ❌ | ❌ |
| Add to Home Screen | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ✅ |
| Standalone Mode | ✅ | ✅ | ✅ |

**Notes**:
- Safari on iOS supports "Add to Home Screen" but not `beforeinstallprompt`
- For iOS, users manually add via Share > Add to Home Screen
- Push notifications work on iOS 16.4+ with standalone installed apps

## Production Checklist

- [ ] VAPID keys generated
- [ ] VAPID public key updated in `app.js`
- [ ] VAPID private key set as Cloudflare secret
- [ ] Icon files created (192x192 and 512x512)
- [ ] Tested install prompt on mobile
- [ ] Tested push notification subscription
- [ ] Verified service worker caching
- [ ] Tested offline functionality
- [ ] Verified standalone mode display

## Next Steps

1. **Create notification scheduling**: Implement cron job to send workout reminders
2. **Add notification preferences**: Let users choose when to receive reminders
3. **Implement badge API**: Show unread workout count on app icon
4. **Add offline support**: Cache workout data for offline viewing
5. **Implement background sync**: Sync workout completions when connection restored
