import { useEffect, useRef } from 'react';
import { ref, runTransaction, set } from 'firebase/database';
import { db } from '../firebase';
import { haversine } from '../utils/haversine';
import { vibrate, VIBRATIONS } from '../utils/vibrate';

export function useAntiCamping(sessionId, players, myRole, active) {
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    if (!active || myRole !== 'seeker') return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const current = playersRef.current;
      const seekers = current.filter((p) => p.role === 'seeker' && p.lat != null && p.lng != null);
      const uncaughtHiders = current.filter(
        (p) => p.role === 'hider' && !p.caught && p.lat != null && p.lng != null
      );

      for (const hider of uncaughtHiders) {
        if (!hider.lastMovedAt || hider.lastLat == null || hider.lastLng == null) continue;

        // Must have been still for 3 minutes
        if (now - hider.lastMovedAt < 180_000) continue;

        // Must not have moved more than 10m since last recorded position
        const distMoved = haversine(hider.lat, hider.lng, hider.lastLat, hider.lastLng);
        if (distMoved >= 10) continue;

        // Must have no seeker within 50m (the 50m grace zone)
        if (seekers.length === 0) continue;
        const nearestSeeker = Math.min(
          ...seekers.map((s) => haversine(hider.lat, hider.lng, s.lat, s.lng))
        );
        if (nearestSeeker <= 50) continue;

        // Transaction guards against multiple seekers firing simultaneously
        try {
          const result = await runTransaction(
            ref(db, `sessions/${sessionId}/players/${hider.uid}/lastCampingPingAt`),
            (current) => {
              if (current != null && now - current < 35_000) return; // abort — too recent
              return now;
            }
          );

          if (result.committed) {
            await set(ref(db, `sessions/${sessionId}/pings/${now}`), {
              [hider.uid]: { lat: hider.lat, lng: hider.lng, name: hider.name },
            });
            vibrate(VIBRATIONS.campingBonus);
          }
        } catch {
          // Transaction conflict — another seeker already handled this
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [active, myRole, sessionId]);
}
