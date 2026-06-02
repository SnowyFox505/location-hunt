# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev               # Start dev server at http://localhost:5173
npm run build             # Production build (outputs to dist/)
npm run preview           # Serve production build locally
npm run lint              # ESLint check
npx vercel deploy --prod  # Deploy to production
```

After any code change, commit → push → `npx vercel deploy --prod`. GitHub and Vercel are already linked; pushes auto-deploy but the Vercel CLI command is faster for immediate releases.

## Environment

Create `.env` in the project root (never commit it — it's gitignored):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```
Note: Vite requires the `VITE_` prefix. Firebase project: `locationhunt-d90c3`, Realtime Database in `europe-west1`.

Required Firebase Console settings:
- Authentication → Email/Password enabled
- Realtime Database rules:
```json
{ "rules": { ".read": "auth != null", ".write": "auth != null",
  "sessions": { ".indexOn": ["meta/code"] } } }
```

## Architecture

**Stack:** Vite 8 + React 19 + Tailwind CSS v4 + Firebase (Auth + Realtime DB) + react-leaflet v4 + leaflet-draw + vite-plugin-pwa

### Session lifecycle

`meta.status` drives all navigation. Every game screen listens to Firebase via `GameContext` and redirects based on status:

```
waiting → hiding → playing → ended
                              ↑
              closed (host left lobby — kicks all players to /home)
```

### Firebase data structure

```
sessions/{sessionId}/
  meta/         host, code, status, createdAt, gameMode,
                settings{gameDuration, hidingDuration, pingInterval}
  players/{uid}/  name, role, color, lat, lng, caught, caughtAt, caughtBy,
                  lastPing, online, lastMovedAt, lastLat, lastLng,
                  lastCampingPingAt, zombie (zombie mode only)
  zone/polygon  array of {lat,lng}
  game/         startedAt, endsAt, nextPingAt, pingInterval, pingCount
  stats/        endedAt, winner
  pings/{timestamp}/{uid}/  lat, lng, name
  catchRequests/{uid}/      seekerUid, seekerName, timestamp

users/{uid}/    displayName, color, photoBase64, emailVerified,
                stats{gamesPlayed, gamesWon, totalDistance, currentStreak, bestStreak}

savedZones/{uid}/{zoneId}/  name, polygon, createdAt, shareCode
sharedZones/{code}/         name, polygon, createdBy, createdAt
pendingVerifications/{uid}/ code, expiresAt
```

### Data flow

`GameProvider` (`src/contexts/GameContext.jsx`) wraps all game screens. Holds a single `onValue()` listener on `sessions/{sessionId}` and exposes: `meta`, `players[]`, `zone`, `game`, `stats`, `pings`, `catchRequests`, `loading`. Every game page wraps itself in `<GameProvider sessionId={sessionId}>`.

`useSession` (`src/hooks/useSession.js`) owns all Firebase writes: `createSession(uid, displayName, settings, zone, gameMode)`, `joinSession`, `startGame` (with optional random role assignments), `setPlayerRole`, `endGame`, `resetSession`, `updateSettings`, `transferHost`, `updatePlayerStats`. `createSession` and `joinSession` both fetch `users/{uid}/color` from Firebase and save `{sessionId, code, ts}` to `localStorage('lastSession')`.

`useGPS` (`src/hooks/useGPS.js`) runs `watchPosition` and throttle-writes lat/lng to Firebase every 5 seconds. Also sets `onDisconnect` to mark player offline.

`usePings` (`src/hooks/usePings.js`) runs only for seekers. Uses `runTransaction` on `game/nextPingAt` so only one client writes each ping batch — avoiding race conditions when multiple seekers are connected.

`useAntiCamping` (`src/hooks/useAntiCamping.js`) runs for seekers every 30 seconds. If a hider hasn't moved >10m in 3 minutes and no seeker is within 50m, it fires a bonus ping. Uses `runTransaction` on `lastCampingPingAt` to deduplicate across multiple seekers.

`useWakeLock` (`src/hooks/useWakeLock.js`) requests the Screen Wake Lock API to keep the display on during gameplay. Re-acquires automatically on iOS when the tab returns to foreground.

`useUserProfile` (`src/hooks/useUserProfile.js`) listens to `users/{uid}` in realtime. Exposes `saveDisplayName`, `saveColor`, `savePhoto` (compresses to 96×96 base64 JPEG), `removePhoto`.

`useZones` (`src/hooks/useZones.js`) manages saved zones at `savedZones/{uid}`. Handles save, delete, share (generates a 6-char code at `sharedZones/{code}`), and import by code.

`AuthContext` (`src/contexts/AuthContext.jsx`) exposes: `user`, `loading`, `emailVerified` (null=loading, true=verified, false=needs verification), `register`, `login`, `logout`, `sendVerificationCode`, `verifyCode`, `deleteAccount`, `mapError`. Email verification uses EmailJS to send a 6-digit code stored at `pendingVerifications/{uid}` with 15-min expiry. Existing users with no `emailVerified` field are treated as verified. `deleteAccount` removes `users/{uid}`, `savedZones/{uid}`, `pendingVerifications/{uid}`, then calls Firebase `deleteUser`.

### Routing

All routes except `/auth` and `/verify-email` are wrapped in `<ProtectedRoute>`. The game flow after "Spiel starten":
1. `/lobby/:sessionId` → detects `status=hiding` → navigates to `/game/:sessionId/role-reveal`
2. `/game/:sessionId/role-reveal` — 5-second animated role reveal, then navigates to `/hiding`
3. `/game/:sessionId/hiding` — countdown for hiders to hide; host sets `status=playing` when countdown ends
4. `/game/:sessionId/play` — main game
5. `/game/:sessionId/end` — stats

`localStorage('lastSession')` stores `{sessionId, code, ts}` on create/join. `HomePage` checks this on mount and shows a "Weiterspielen" card if the session is still active (<2h old, status not ended/closed).

### Map rendering — critical constraint

Leaflet `MapContainer` **must** have a parent with an explicit computed height. `height: 100%` does not resolve from flex-determined heights on mobile.

**Working pattern** (used in all game screens):
```jsx
<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
  <MapContainer className="w-full h-full" ...>
  {/* UI overlaid on top: */}
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
```

Leaflet's internal z-indexes go up to ~800, so overlaid UI needs `zIndex: 1000+`.

`src/firebase.js` applies the Leaflet icon fix (delete `_getIconUrl`, set custom PNG imports) — this must run before any map renders.

Leaflet `Tooltip` components use class `player-tooltip` (defined in `index.css`) for dark styling — without this override the tooltip background is white.

`PlayerMarker.jsx` uses `useMemo` on the icon object so Leaflet doesn't replace the DOM on every re-render (which would restart CSS animations).

### Modal centering pattern

**Never** use `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` for modals — this breaks on iOS Safari inside certain parent contexts. Always use a full-screen flex backdrop:
```jsx
<div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: 24, zIndex: 3000 }}
     onClick={onClose}>
  <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360 }}>
    {/* modal content */}
  </div>
</div>
```

### Styling

Tailwind v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`). Custom colors defined in `src/index.css` under `@theme`:

| Class | Hex |
|---|---|
| `game-bg` | `#0D1117` |
| `game-card` | `#161B22` |
| `game-border` | `#30363D` |
| `game-text` | `#E6EDF3` |
| `game-muted` | `#8B949E` |
| `game-blue` | `#3B82F6` |
| `game-green` | `#22C55E` |
| `game-orange` | `#F97316` |
| `game-red` | `#EF4444` |

Tailwind v4 opacity modifiers on custom colors are unreliable — use inline `style={{ backgroundColor: 'rgba(...)' }}` instead.

Glass card style used on CreatePage and similar screens:
```js
{ background: 'rgba(22,27,34,0.72)', backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(48,54,61,0.8)', borderRadius: 16 }
```

### Game logic highlights

**Catch mechanic** (`GamePage.jsx`): Seeker runs `haversine` distance check every 2 seconds against all uncaught hiders. If distance < `catchRadius` → seeker sends a catch claim to `catchRequests/{hiderUid}`; hider receives a confirmation modal and must accept.

**Zombie mode** (`meta.gameMode === 'zombie'`): When a hider confirms a catch, their `role` is set to `'seeker'` and `zombie: true` is written instead of `caught: true`. The catch win condition checks `players.filter(p => p.role === 'hider' && p.uid !== user.uid).length === 0`. Zombie players automatically join the ping system (role === 'seeker') and see hider pings. Their marker color is purple (`#A855F7`).

**Out-of-zone penalty**: `pointInPolygon` (ray-casting) runs on every GPS update. If a hider is outside the zone, their live position is shown to seekers immediately (orange pulsing marker).

**Ping deduplication** (`GameMap.jsx`): Only the latest ping per hider UID is shown — iterates all `pings/{timestamp}` entries and keeps the newest per player.

**leaflet-draw** (`ZoneDrawer.jsx`): Must be imported as side-effect (`import 'leaflet-draw'`) and draw controls created only inside `useEffect`. The `DrawControl` component calls `useMap()` so it must render inside `<MapContainer>`.

**QR codes**: LobbyPage shows a QR code of the session code via `qrcode.react`. JoinPage has a camera scanner using `jsqr` + `getUserMedia` + `requestAnimationFrame` — scanned code pre-fills the input field. QR flow is in-app only (not scannable by system camera) to keep PWA users within the app.

**`navigator.vibrate` is not supported on iOS** — the vibration utility has been removed entirely.
