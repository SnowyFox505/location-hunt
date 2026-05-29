import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

const GameContext = createContext(null);

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ sessionId, children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const sessionRef = ref(db, `sessions/${sessionId}`);
    const unsub = onValue(sessionRef, (snap) => {
      setSession(snap.val());
      setLoading(false);
    });
    return unsub;
  }, [sessionId]);

  const meta = session?.meta || null;
  const players = session?.players ? Object.entries(session.players).map(([uid, data]) => ({ uid, ...data })) : [];
  const zone = session?.zone?.polygon || null;
  const game = session?.game || null;
  const stats = session?.stats || null;
  const pings = session?.pings || null;

  return (
    <GameContext.Provider value={{ session, meta, players, zone, game, stats, pings, loading }}>
      {children}
    </GameContext.Provider>
  );
}
