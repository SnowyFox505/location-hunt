# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build (outputs to dist/)
npm run preview   # Serve production build locally
npm run lint      # ESLint check
vercel --prod --yes  # Deploy to production
```

After any code change, commit → push → `vercel --prod --yes`. GitHub and Vercel are already linked; pushes auto-deploy but `vercel --prod` is faster for immediate releases.

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
```
Note: Vite requires the `VITE_` prefix — not `REACT_APP_`.

Firebase project: `locationhunt-d90c3`, Realtime Database in `europe-west1`.

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

### Data flow

`GameProvider` (`src/contexts/GameContext.jsx`) wraps all game screens. It holds a single `onValue()` listener on `sessions/{sessionId}` and exposes: `meta`, `players[]`, `zone`, `game`, `stats`, `pings`, `loading`. Every game page gets this via `useGame()`. **Each game page wraps itself in `<GameProvider sessionId={sessionId}>`.**

`useSession` (`src/hooks/useSession.js`) owns all Firebase writes: createSession, joinSession, startGame (with optional random role assignments), setPlayerRole, endGame, resetSession.

`useGPS` (`src/hooks/useGPS.js`) runs `watchPosition` and throttle-writes lat/lng to Firebase every 5 seconds. Also sets `onDisconnect` to mark player offline.

`usePings` (`src/hooks/usePings.js`) runs only for seekers. Uses `runTransaction` on `game/nextPingAt` so only one client writes each ping batch — avoiding race conditions when multiple seekers are connected.

### Routing

All routes except `/auth` are wrapped in `<ProtectedRoute>`. The game flow after "Spiel starten":
1. `/lobby/:sessionId` → detects `status=hiding` → navigates to `/game/:sessionId/role-reveal`
2. `/game/:sessionId/role-reveal` — 5-second role reveal screen, then navigates to `/hiding`
3. `/game/:sessionId/hiding` — countdown for hiders to hide; host sets `status=playing` when countdown ends
4. `/game/:sessionId/play` — main game
5. `/game/:sessionId/end` — stats

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

The `src/firebase.js` module also applies the Leaflet icon fix (delete `_getIconUrl`, set custom PNG imports) — this must run before any map renders.

### Styling

Tailwind v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`). Custom colors are defined in `src/index.css` under `@theme`:

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

For background opacity (e.g. `bg-game-bg/95`), Tailwind v4 opacity modifiers on custom colors can be unreliable — use inline `style={{ backgroundColor: 'rgba(13,17,23,0.95)' }}` instead.

### Game logic highlights

**Catch mechanic** (`GamePage.jsx`): Seeker runs `haversine` distance check every 2 seconds against all uncaught hiders. If distance < `catchRadius` meters → marks hider as caught in Firebase. If all hiders caught → ends game.

**Out-of-zone penalty**: `pointInPolygon` (ray-casting) runs on every GPS update. If a hider is outside the zone, their live position is shown to seekers immediately (orange pulsing marker), not waiting for the next scheduled ping.

**Ping deduplication** (`GameMap.jsx`): Only the latest ping per hider UID is shown — iterates all `pings/{timestamp}` entries and keeps the newest per player.

**leaflet-draw** (`ZoneDrawer.jsx`): Must be imported as side-effect (`import 'leaflet-draw'`) and draw controls created only inside `useEffect`. The `DrawControl` component calls `useMap()` so it must render inside `<MapContainer>`.
