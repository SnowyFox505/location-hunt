import { ref, set, update, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils/sessionCode';

export function useSession() {
  async function createSession(uid, displayName, settings, zone) {
    const code = generateUniqueCode();
    const sessionRef = push(ref(db, 'sessions'));
    const sessionId = sessionRef.key;
    const now = Date.now();

    await set(sessionRef, {
      meta: {
        host: uid,
        code,
        status: 'waiting',
        createdAt: now,
        settings: {
          gameDuration: settings.gameDuration,
          hidingDuration: settings.hidingDuration,
          pingInterval: settings.pingInterval,
          catchRadius: settings.catchRadius,
        },
      },
      players: {
        [uid]: {
          name: displayName,
          role: 'hider',
          lat: null,
          lng: null,
          caught: false,
          caughtAt: null,
          caughtBy: null,
          lastPing: null,
          online: true,
        },
      },
      zone: { polygon: zone },
    });

    return { sessionId, code };
  }

  async function joinSession(code, uid, displayName) {
    const upperCode = code.toUpperCase();
    const q = query(ref(db, 'sessions'), orderByChild('meta/code'), equalTo(upperCode));
    const snap = await get(q);
    if (!snap.exists()) throw new Error('Session nicht gefunden.');

    let sessionId = null;
    let sessionData = null;
    snap.forEach((child) => {
      sessionId = child.key;
      sessionData = child.val();
    });

    if (!sessionData) throw new Error('Session nicht gefunden.');
    if (sessionData.meta.status !== 'waiting') throw new Error('Das Spiel wurde bereits gestartet.');

    if (!sessionData.players?.[uid]) {
      await set(ref(db, `sessions/${sessionId}/players/${uid}`), {
        name: displayName,
        role: 'hider',
        lat: null,
        lng: null,
        caught: false,
        caughtAt: null,
        caughtBy: null,
        lastPing: null,
        online: true,
      });
    }

    return sessionId;
  }

  async function startGame(sessionId, settings) {
    const now = Date.now();
    const hidingMs = settings.hidingDuration * 60 * 1000;
    const gameMs = settings.gameDuration * 60 * 1000;
    const pingMs = settings.pingInterval * 60 * 1000;

    await update(ref(db, `sessions/${sessionId}`), {
      'meta/status': 'hiding',
      'game/startedAt': now,
      'game/hidingEndsAt': now + hidingMs,
      'game/endsAt': now + hidingMs + gameMs,
      'game/nextPingAt': now + hidingMs + pingMs,
      'game/pingInterval': pingMs,
      'game/pingCount': 0,
    });
  }

  async function setPlayerRole(sessionId, uid, role) {
    await set(ref(db, `sessions/${sessionId}/players/${uid}/role`), role);
  }

  async function endGame(sessionId, winner) {
    await update(ref(db, `sessions/${sessionId}`), {
      'meta/status': 'ended',
      'stats/endedAt': Date.now(),
      'stats/winner': winner,
    });
  }

  async function resetSession(sessionId) {
    await update(ref(db, `sessions/${sessionId}/meta`), { status: 'waiting' });
  }

  return { createSession, joinSession, startGame, setPlayerRole, endGame, resetSession };
}
