import { useEffect, useRef } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { db } from '../firebase';
import { haversine } from '../utils/haversine';

export function usePointsTimer(sessionId, myUid, position, isActive) {
  const lastBonusPosRef = useRef(null);
  const lastBonusTimeRef = useRef(0);

  // +1 point every minute
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      runTransaction(
        ref(db, `sessions/${sessionId}/players/${myUid}/points`),
        (pts) => (pts || 0) + 1
      ).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [isActive, sessionId, myUid]);

  // +1 movement bonus — min 15m moved, max 1× per 2 minutes
  useEffect(() => {
    if (!isActive || !position) return;
    if (!lastBonusPosRef.current) {
      lastBonusPosRef.current = position;
      return;
    }
    const now = Date.now();
    if (now - lastBonusTimeRef.current < 120_000) return;
    const dist = haversine(position.lat, position.lng, lastBonusPosRef.current.lat, lastBonusPosRef.current.lng);
    if (dist >= 15) {
      lastBonusTimeRef.current = now;
      lastBonusPosRef.current = position;
      runTransaction(
        ref(db, `sessions/${sessionId}/players/${myUid}/points`),
        (pts) => (pts || 0) + 1
      ).catch(() => {});
    }
  }, [position?.lat, position?.lng, isActive, sessionId, myUid]);
}
