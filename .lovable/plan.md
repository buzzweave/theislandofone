

# Fix: Published Site Not Matching Preview (Service Worker Cache)

## Problem

Your site uses a PWA (Progressive Web App) with Workbox caching. When you publish, the service worker in returning visitors' browsers continues serving the old cached version of JS, CSS, and HTML files. The `autoUpdate` setting does eventually update, but it requires the new service worker to install **and** the user to reload — sometimes requiring two refreshes.

Your published site is showing an older 2-column layout without search/category filters, while the preview shows the correct 3-column layout with all features.

## Solution

Force the service worker to **skip waiting** and immediately take control, so users always get the latest version without needing multiple refreshes.

## Changes

### 1. Update `vite.config.ts` — Add `skipWaiting` and `clientsClaim`

Add `skipWaiting: true` and `clientsClaim: true` to the workbox config. This tells the new service worker to immediately activate and take over, replacing the old cached content right away.

```
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: [...],
  ...
}
```

### 2. Update `src/main.tsx` — Force reload on service worker update

Add a listener that detects when a new service worker has activated and reloads the page once, ensuring the user sees the latest version immediately after publish.

## Files Modified

| File | Change |
|------|--------|
| `vite.config.ts` | Add `skipWaiting: true` and `clientsClaim: true` to workbox config |
| `src/main.tsx` | Add service worker update detection with auto-reload |

## What This Fixes

- Published site will immediately serve the latest code to all visitors
- No more stale cached pages after publishing
- The service worker update happens transparently — users just see the latest version

