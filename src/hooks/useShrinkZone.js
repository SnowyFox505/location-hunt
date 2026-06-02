import { useEffect, useRef } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { db } from '../firebase';

// Advances game/currentShrinkStep and game/nextShrinkAt atomically every 2 minutes.
// Only active seekers compete via runTransaction — one client wins, others abort.
export function useShrinkZone(sessionId, game, shrinkZonesLength, myRole, isActive) {
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!isActive || myRole !== 'seeker' || !shrinkZonesLength) return;

    let processing = false;

    const interval = setInterval(async () => {
      const g = gameRef.current;
      if (!g?.nextShrinkAt || processing || Date.now() < g.nextShrinkAt) return;

      processing = true;
      try {
        await runTransaction(ref(db, `sessions/${sessionId}/game`), (current) => {
          if (!current?.nextShrinkAt) return current;
          if (Date.now() < current.nextShrinkAt) return; // abort — not time yet
          const step = current.currentShrinkStep || 0;
          if (step >= shrinkZonesLength - 1) return; // abort — no more steps
          return {
            ...current,
            currentShrinkStep: step + 1,
            nextShrinkAt: current.nextShrinkAt + (current.shrinkInterval || 120_000),
          };
        });
      } catch {
        // Transaction conflict — next tick retries
      } finally {
        processing = false;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive, myRole, sessionId, shrinkZonesLength]);
}
