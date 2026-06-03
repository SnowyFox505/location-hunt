import { ref, set, update, push, get, query, orderByChild, equalTo, runTransaction } from 'firebase/database';
import { db } from '../firebase';
import { generateUniqueCode } from '../utils/sessionCode';
import { computeShrinkZones } from '../utils/shrinkPolygon';

export function useSession() {
  async function createSession(uid, displayName, settings, zone, gameMode = 'classic') {
    const code = generateUniqueCode();
    const sessionRef = push(ref(db, 'sessions'));
    const sessionId = sessionRef.key;
    const now = Date.now();

    const colorSnap = await get(ref(db, `users/${uid}/color`));
    const color = colorSnap.val() || '#3B82F6';

    await set(sessionRef, {
      meta: {
        host: uid,
        code,
        status: 'waiting',
        createdAt: now,
        gameMode,
        settings: {
          gameDuration: settings.gameDuration,
          hidingDuration: settings.hidingDuration,
          pingInterval: settings.pingInterval,
        },
      },
      players: {
        [uid]: {
          name: displayName,
          color,
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

    localStorage.setItem('lastSession', JSON.stringify({ sessionId, code, ts: now }));
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
      const colorSnap = await get(ref(db, `users/${uid}/color`));
      const color = colorSnap.val() || '#3B82F6';
      await set(ref(db, `sessions/${sessionId}/players/${uid}`), {
        name: displayName,
        color,
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

    localStorage.setItem('lastSession', JSON.stringify({ sessionId, code: upperCode, ts: Date.now() }));
    return sessionId;
  }

  async function startGame(sessionId, settings, roleAssignments = null, gameMode = 'classic') {
    const now = Date.now();
    const hidingMs = settings.hidingDuration * 60 * 1000;
    const gameMs = settings.gameDuration * 60 * 1000;
    const pingMs = settings.pingInterval * 60 * 1000;

    const patch = {
      'meta/status': 'hiding',
      'game/startedAt': now,
      'game/hidingEndsAt': now + hidingMs,
      'game/endsAt': now + hidingMs + gameMs,
      'game/nextPingAt': now + hidingMs + pingMs,
      'game/pingInterval': pingMs,
      'game/pingCount': 0,
    };

    if (gameMode === 'shrink') {
      const zoneSnap = await get(ref(db, `sessions/${sessionId}/zone/polygon`));
      const polygon = zoneSnap.val();
      if (polygon) {
        const zones = computeShrinkZones(polygon, settings.gameDuration);
        patch['shrinkZones'] = zones;
        patch['game/currentShrinkStep'] = 0;
        patch['game/nextShrinkAt'] = now + hidingMs + 120_000;
        patch['game/shrinkInterval'] = 120_000;
      }
    }

    if (gameMode === 'abilities') {
      const playersSnap = await get(ref(db, `sessions/${sessionId}/players`));
      Object.keys(playersSnap.val() || {}).forEach((uid) => {
        patch[`players/${uid}/points`]       = 0;
        patch[`players/${uid}/ghostUsed`]    = false;
        patch[`players/${uid}/fakePingActive`] = false;
        patch[`players/${uid}/ghostActive`]  = false;
      });
    }

    if (roleAssignments) {
      Object.entries(roleAssignments).forEach(([uid, role]) => {
        patch[`players/${uid}/role`] = role;
      });
    }

    await update(ref(db, `sessions/${sessionId}`), patch);
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
    const snap = await get(ref(db, `sessions/${sessionId}/players`));
    const players = snap.val() || {};

    const patch = {
      'meta/status': 'waiting',
      'meta/hostEnded': null,
      'pings': null,
      'game': null,
      'stats': null,
      'catchRequests': null,
      'shrinkZones': null,
      'abilities': null,
    };

    Object.keys(players).forEach((uid) => {
      patch[`players/${uid}/caught`]           = false;
      patch[`players/${uid}/caughtAt`]          = null;
      patch[`players/${uid}/caughtBy`]          = null;
      patch[`players/${uid}/role`]              = 'hider';
      patch[`players/${uid}/usedDecoy`]         = null;
      patch[`players/${uid}/decoyPingTimestamp`] = null;
      patch[`players/${uid}/queuedDecoy`]       = null;
      patch[`players/${uid}/lastCampingPingAt`] = null;
      patch[`players/${uid}/lastMovedAt`]       = null;
      patch[`players/${uid}/lastLat`]           = null;
      patch[`players/${uid}/lastLng`]           = null;
      patch[`players/${uid}/points`]            = null;
      patch[`players/${uid}/ghostUsed`]         = null;
      patch[`players/${uid}/fakePingActive`]    = null;
      patch[`players/${uid}/ghostActive`]       = null;
    });

    await update(ref(db, `sessions/${sessionId}`), patch);
  }

  async function updateSettings(sessionId, settings) {
    await update(ref(db, `sessions/${sessionId}/meta`), { settings });
  }

  async function transferHost(sessionId, newHostUid) {
    await update(ref(db, `sessions/${sessionId}/meta`), { host: newHostUid });
  }

  async function updatePlayerStats(uid, myPlayer, gameStats, distanceMeters) {
    if (!uid || !myPlayer) return;
    const isHider = myPlayer.role === 'hider';
    const won = isHider ? !myPlayer.caught : gameStats?.winner === 'seeker';
    try {
      await runTransaction(ref(db, `users/${uid}/stats`), (current) => {
        const s = current || {};
        const newStreak = isHider && won  ? (s.currentStreak || 0) + 1
                        : isHider && !won ? 0
                        : (s.currentStreak || 0); // seeker: streak unchanged
        return {
          gamesPlayed:   (s.gamesPlayed   || 0) + 1,
          gamesWon:      (s.gamesWon      || 0) + (won ? 1 : 0),
          totalDistance: (s.totalDistance || 0) + Math.round(distanceMeters || 0),
          currentStreak: newStreak,
          bestStreak:    Math.max(s.bestStreak || 0, newStreak),
        };
      });
    } catch {
      // Non-critical — silently ignore
    }
  }

  return { createSession, joinSession, startGame, setPlayerRole, endGame, resetSession, updateSettings, transferHost, updatePlayerStats };
}
