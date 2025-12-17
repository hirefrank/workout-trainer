# Service Worker & Caching Strategy

## Overview

The Workout Trainer app uses a Service Worker for PWA functionality including offline support and push notifications. However, aggressive caching can cause users to see stale content after deployments.

## The Problem

**Symptom**: Users see old versions of the site even after you deploy updates.

**Root Cause**: The original service worker used a "cache-first" strategy for all content, meaning:
1. First visit: Fetch from network, store in cache
2. Subsequent visits: Serve from cache, never check network
3. After deployment: Users still see cached old version

This is especially problematic for HTML pages which contain the app logic and UI.

## The Solution

### Current Caching Strategy (v2+)

We now use a **hybrid caching strategy**:

**HTML Pages**: Network-first
- Always tries to fetch fresh content from network
- Falls back to cache only if offline
- Users always get latest features and fixes

**Static Assets (CSS, JS, images)**: Cache-first
- Loads from cache for fast performance
- Updates cache in background when files change
- Good balance of speed and freshness

### Cache Versioning

The service worker uses a version number in the cache name:

```javascript
const CACHE_NAME = 'workout-trainer-v2';
```

**When to bump the version**:
- After major feature deployments
- When HTML structure changes significantly
- If you need to force all users to clear their cache
- Generally: increment on every production deployment to be safe

**How to bump**:
1. Edit `public/workout/sw.js`
2. Change `CACHE_NAME = 'workout-trainer-v2'` to `v3`, `v4`, etc.
3. The old cache will be automatically deleted on next user visit

## Development vs Production

### Development (localhost)

Service worker is **disabled** in `public/workout/app.js`:

```javascript
// Disabled during development to avoid caching issues
/*
if ('serviceWorker' in navigator) {
  // ... registration code
}
*/
```

**Why**: Prevents caching issues during rapid development iterations.

**To re-enable for testing**: Uncomment the registration block.

### Production (deployed)

Service worker is **enabled** (uncomment in app.js before deploying):

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/workout/sw.js')
      .then((registration) => console.log('SW registered'))
      .catch((error) => console.error('SW failed:', error));
  });
}
```

## Deployment Checklist

When deploying updates:

1. **Bump cache version** in `sw.js`:
   ```javascript
   const CACHE_NAME = 'workout-trainer-v3'; // increment
   ```

2. **Re-enable service worker** in `app.js` (uncomment registration):
   ```javascript
   if ('serviceWorker' in navigator) {
     // ... uncomment this block
   }
   ```

3. **Build and deploy**:
   ```bash
   pnpm build
   pnpm deploy
   ```

4. **After deployment**: Users will get new service worker on next visit
   - Automatic cache cleanup of old versions
   - Fresh HTML content via network-first strategy

## Troubleshooting

### Users Still Seeing Old Version

**Solution 1: Force cache invalidation**
1. Bump service worker version in `sw.js`
2. Deploy
3. Users will get fresh content on next visit

**Solution 2: Manual cache clear (for individual users)**
1. Open DevTools (F12)
2. Application tab → Service Workers → Unregister
3. Application → Storage → Clear site data
4. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

### Development Caching Issues

**Symptoms**:
- Seeing old code during `pnpm dev`
- Changes not appearing in browser
- Service worker registered in console

**Solution**:
1. Verify service worker is commented out in `app.js`
2. Clear browser cache and service workers
3. Restart dev server

**Quick check**:
```bash
# Should see service worker registration commented out
grep -A 5 "Service Worker Registration" public/workout/app.js
```

### Testing Service Worker Locally

To test PWA features in development:

1. **Temporarily re-enable** in `app.js`
2. **Run dev server**: `pnpm dev`
3. **Test**: Install prompt, offline mode, etc.
4. **Clean up**: Re-disable service worker before continuing development

## Best Practices

### 1. Always Bump Version on Deploy
```bash
# Before deploying, update version
sed -i "s/workout-trainer-v[0-9]*/workout-trainer-v$(date +%s)/" public/workout/sw.js
```

### 2. Keep SW Disabled in Development
- Prevents caching headaches
- Faster iteration cycles
- Less confusion

### 3. Use Network-First for Dynamic Content
- HTML pages (app logic)
- API responses
- Any frequently changing content

### 4. Use Cache-First for Static Assets
- CSS files
- JavaScript bundles
- Images, fonts
- Rarely-changing resources

### 5. Test PWA Features Separately
- Don't develop with SW enabled
- Enable only when testing PWA-specific features
- Disable again after testing

## Service Worker Code Reference

### Current Implementation

**Location**: `public/workout/sw.js`

**Key Features**:
- ✅ Cache versioning (manual bump)
- ✅ Network-first for HTML
- ✅ Cache-first for static assets
- ✅ Automatic old cache cleanup
- ✅ Immediate activation (`skipWaiting`)
- ✅ Push notification support

**Future Enhancements** (if needed):
- Automatic version bumping based on build hash
- Stale-while-revalidate for faster loads
- Background sync for offline actions
- Precaching of critical routes

## Related Documentation

- [PWA Setup](./PWA_SETUP.md) - Push notifications and install prompts
- [CLAUDE.md](../CLAUDE.md) - Main development guide
- [README.md](../README.md) - Project overview

## Questions?

If you encounter caching issues not covered here:
1. Check browser DevTools → Application → Service Workers
2. Verify cache version number
3. Confirm network-first strategy for HTML
4. As last resort: bump version and redeploy
