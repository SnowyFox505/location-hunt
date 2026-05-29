import { useState, useEffect } from 'react';
import { ref, push, set, get, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode() {
  let c = '';
  for (let i = 0; i < 6; i++) c += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  return c;
}

export function useZones(uid) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const unsub = onValue(ref(db, `savedZones/${uid}`), (snap) => {
      const data = snap.val();
      setZones(data
        ? Object.entries(data).map(([id, z]) => ({ id, ...z })).sort((a, b) => b.createdAt - a.createdAt)
        : []
      );
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function saveZone(name, polygon) {
    const zoneRef = push(ref(db, `savedZones/${uid}`));
    await set(zoneRef, { name: name.trim(), polygon, createdAt: Date.now(), shareCode: null });
    return zoneRef.key;
  }

  async function deleteZone(zoneId) {
    const zone = zones.find((z) => z.id === zoneId);
    if (zone?.shareCode) {
      await remove(ref(db, `sharedZones/${zone.shareCode}`));
    }
    await remove(ref(db, `savedZones/${uid}/${zoneId}`));
  }

  async function generateShareCode(zoneId) {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone nicht gefunden.');
    if (zone.shareCode) return zone.shareCode;

    const code = makeCode();
    await Promise.all([
      update(ref(db, `savedZones/${uid}/${zoneId}`), { shareCode: code }),
      set(ref(db, `sharedZones/${code}`), {
        name: zone.name,
        polygon: zone.polygon,
        createdBy: uid,
        createdAt: Date.now(),
      }),
    ]);
    return code;
  }

  async function importByCode(code) {
    const snap = await get(ref(db, `sharedZones/${code.toUpperCase().trim()}`));
    if (!snap.exists()) throw new Error('Zone nicht gefunden. Code prüfen.');
    return snap.val(); // { name, polygon, createdBy, createdAt }
  }

  return { zones, loading, saveZone, deleteZone, generateShareCode, importByCode };
}
