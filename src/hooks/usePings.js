import { useEffect, useRef } from 'react';
import { ref, runTransaction, set, get } from 'firebase/database';
import { db } from '../firebase';
import { vibrate, VIBRATIONS } from '../utils/vibrate';

export function usePings(sessionId, players, myUid, myRole, active) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active || !sessionId || myRole !== 'seeker') return;

    const interval = setInterval(async () => {
      if (!activeRef.current) return;
      try {
        const [playersSnap, gameSnap] = await Promise.all([
          get(ref(db, `sessions/${sessionId}/players`)),
          get(ref(db, `sessions/${sessionId}/game`)),
        ]);

        const gameData = gameSnap.val();
        if (!gameData || !gameData.nextPingAt || !gameData.pingInterval) return;

        const { nextPingAt, pingInterval } = gameData;
        if (Date.now() < nextPingAt) return;

        let didAdvance = false;
        const result = await runTransaction(ref(db, `sessions/${sessionId}/game/nextPingAt`), (current) => {
          if (current === null) return current;
          if (Date.now() >= current) {
            didAdvance = true;
            return current + pingInterval;
          }
          didAdvance = false;
          return current;
        });

        if (!result.committed || !didAdvance) return;

        const playersData = playersSnap.val() || {};
        const pingData = {};
        Object.entries(playersData).forEach(([uid, p]) => {
          if (p.role === 'hider' && !p.caught && p.lat != null && p.lng != null) {
            pingData[uid] = { lat: p.lat, lng: p.lng, name: p.name };
          }
        });

        if (Object.keys(pingData).length > 0) {
          await set(ref(db, `sessions/${sessionId}/pings/${Date.now()}`), pingData);
          vibrate(VIBRATIONS.ping);
        }

        await runTransaction(ref(db, `sessions/${sessionId}/game/pingCount`), (c) => (c || 0) + 1);
      } catch {
        // Transaction conflict or network error — next tick will retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [active, sessionId, myRole]);
}
