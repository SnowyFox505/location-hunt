import { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

const GameContext = createContext(null);

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ sessionId, children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});

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

  const playerUidsKey = session?.players ? Object.keys(session.players).sort().join(',') : '';

  useEffect(() => {
    if (!playerUidsKey) return;
    const uids = playerUidsKey.split(',');
    const unsubs = uids.map((uid) =>
      onValue(ref(db, `users/${uid}`), (snap) => {
        const data = snap.val() || {};
        setProfiles((prev) => ({
          ...prev,
          [uid]: { color: data.color || null, photoBase64: data.photoBase64 || null },
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [playerUidsKey]);

  const meta = session?.meta || null;
  const players = session?.players
    ? Object.entries(session.players).map(([uid, data]) => ({
        uid,
        ...data,
        profileColor: profiles[uid]?.color || null,
        photoBase64: profiles[uid]?.photoBase64 || null,
      }))
    : [];
  const zone = session?.zone?.polygon || null;
  const game = session?.game || null;
  const stats = session?.stats || null;
  const pings = session?.pings || null;
  const catchRequests = session?.catchRequests || null;

  return (
    <GameContext.Provider value={{ session, meta, players, zone, game, stats, pings, catchRequests, loading }}>
      {children}
    </GameContext.Provider>
  );
}
