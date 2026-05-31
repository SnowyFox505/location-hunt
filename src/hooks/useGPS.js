import { useState, useEffect, useRef } from 'react';
import { ref, set, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import { haversine } from '../utils/haversine';

export function useGPS(sessionId, uid, active = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const lastWriteRef = useRef(0);
  const lastSavedPosRef = useRef(null); // for lastMovedAt tracking

  useEffect(() => {
    if (!active || !sessionId || !uid) return;

    onDisconnect(ref(db, `sessions/${sessionId}/players/${uid}/online`)).set(false);

    if (!navigator.geolocation) {
      setError('GPS wird von diesem Gerät nicht unterstützt.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPosition({ lat, lng });
        setError(null);

        const now = Date.now();
        if (now - lastWriteRef.current > 5000) {
          lastWriteRef.current = now;
          set(ref(db, `sessions/${sessionId}/players/${uid}/lat`), lat);
          set(ref(db, `sessions/${sessionId}/players/${uid}/lng`), lng);
          set(ref(db, `sessions/${sessionId}/players/${uid}/lastPing`), now);
          set(ref(db, `sessions/${sessionId}/players/${uid}/online`), true);

          // Track last significant movement (> 2m) for anti-camping rule
          const prev = lastSavedPosRef.current;
          const moved = prev ? haversine(lat, lng, prev.lat, prev.lng) : Infinity;
          if (moved > 2) {
            lastSavedPosRef.current = { lat, lng };
            set(ref(db, `sessions/${sessionId}/players/${uid}/lastMovedAt`), now);
            set(ref(db, `sessions/${sessionId}/players/${uid}/lastLat`), lat);
            set(ref(db, `sessions/${sessionId}/players/${uid}/lastLng`), lng);
          }
        }
      },
      (err) => {
        if (err.code === 1) setError('GPS-Berechtigung verweigert. Bitte erlaube den Standortzugriff.');
        else if (err.code === 2) setError('GPS-Position konnte nicht ermittelt werden.');
        else setError('GPS-Fehler. Bitte versuche es erneut.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, sessionId, uid]);

  return { position, error };
}
