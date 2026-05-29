import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useGPS } from '../hooks/useGPS';
import { usePings } from '../hooks/usePings';
import { useWakeLock } from '../hooks/useWakeLock';
import { haversine } from '../utils/haversine';
import { pointInPolygon } from '../utils/pointInPolygon';
import { db } from '../firebase';
import GameMap from '../components/Map/GameMap';
import Countdown from '../components/UI/Countdown';

function GameContent() {
  const { sessionId } = useParams();
  const { meta, players, zone, game, pings, loading } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [outOfZone, setOutOfZone] = useState(false);
  const [catchableHider, setCatchableHider] = useState(null);
  const [catching, setCatching] = useState(false);

  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';
  const isCaught = myPlayer?.caught;

  const { position } = useGPS(sessionId, user.uid, true);
  usePings(sessionId, players, user.uid, myPlayer?.role, meta?.status === 'playing');
  useWakeLock(true);

  useEffect(() => {
    if (!loading && meta?.status === 'ended') navigate(`/game/${sessionId}/end`, { replace: true });
  }, [meta?.status, loading]);

  useEffect(() => {
    if (!game?.endsAt) return;
    const remaining = game.endsAt - Date.now();
    if (remaining <= 0) { handleGameEnd('hider'); return; }
    const t = setTimeout(() => handleGameEnd('hider'), remaining);
    return () => clearTimeout(t);
  }, [game?.endsAt]);

  async function handleGameEnd(winner) {
    if (meta?.status !== 'playing') return;
    await update(ref(db, `sessions/${sessionId}`), {
      'meta/status': 'ended',
      'stats/endedAt': Date.now(),
      'stats/winner': winner,
    });
  }

  // Range check: find nearest uncaught hider within catch radius → show button
  useEffect(() => {
    if (!isSeeker || !position || !meta?.settings) {
      setCatchableHider(null);
      return;
    }

    const interval = setInterval(() => {
      const uncaught = players.filter(
        (p) => p.role === 'hider' && !p.caught && p.lat != null && p.lng != null
      );

      let nearest = null;
      let nearestDist = Infinity;
      for (const hider of uncaught) {
        const dist = haversine(position.lat, position.lng, hider.lat, hider.lng);
        if (dist < meta.settings.catchRadius && dist < nearestDist) {
          nearest = hider;
          nearestDist = dist;
        }
      }

      setCatchableHider(nearest ? { ...nearest, distance: Math.round(nearestDist) } : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSeeker, position, players, meta?.settings]);

  async function handleCatch() {
    if (!catchableHider || catching) return;
    setCatching(true);
    try {
      const now = Date.now();
      await update(ref(db, `sessions/${sessionId}/players/${catchableHider.uid}`), {
        caught: true,
        caughtAt: now,
        caughtBy: user.uid,
      });
      setCatchableHider(null);

      const allHiders = players.filter((p) => p.role === 'hider');
      const allCaught = allHiders.every((p) => p.uid === catchableHider.uid || p.caught);
      if (allCaught) await handleGameEnd('seeker');
    } finally {
      setCatching(false);
    }
  }

  useEffect(() => {
    if (!position || !zone) return;
    setOutOfZone(!pointInPolygon(position.lat, position.lng, zone));
  }, [position, zone]);

  if (loading || !meta) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hiders = players.filter((p) => p.role === 'hider');
  const caughtCount = hiders.filter((p) => p.caught).length;

  const outOfZoneHiders = zone
    ? hiders.filter((p) => !p.caught && p.lat != null && p.lng != null && !pointInPolygon(p.lat, p.lng, zone))
    : [];
  const outOfZoneUids = outOfZoneHiders.map((p) => p.uid);

  const mapPlayers = isSeeker
    ? [
        ...players.filter((p) => p.role === 'seeker'),
        ...players.filter((p) => p.role === 'hider' && (p.caught || outOfZoneUids.includes(p.uid))),
      ]
    : players.filter((p) => p.uid === user.uid);

  const zoneCenter = zone && zone.length > 0
    ? [zone.reduce((s, p) => s + p.lat, 0) / zone.length, zone.reduce((s, p) => s + p.lng, 0) / zone.length]
    : null;
  const mapCenter = position ? [position.lat, position.lng] : zoneCenter;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <GameMap
        center={mapCenter}
        zone={zone}
        players={mapPlayers}
        outOfZonePlayers={outOfZoneUids}
        pings={isSeeker ? pings : null}
        myUid={user.uid}
        showPlayers
        showPings={isSeeker}
      />

      {/* Top UI overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        {outOfZone && (
          <div className="bg-game-red text-white text-center py-2 text-sm font-bold">
            Du verlässt die Spielzone! Kehre zurück.
          </div>
        )}
        {isCaught && !isSeeker && (
          <div style={{ backgroundColor: 'rgba(127,29,29,0.95)', borderBottom: '1px solid #EF4444' }}
               className="px-4 py-2 text-game-red text-sm text-center font-semibold">
            Du wurdest gefangen!
          </div>
        )}
        <div style={{ backgroundColor: 'rgba(13,17,23,0.97)', borderBottom: '1px solid #30363D' }} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              {isSeeker
                ? <span className="text-game-red text-xs font-bold uppercase tracking-wide">Seeker</span>
                : <span className="text-game-green text-xs font-bold uppercase tracking-wide">{isCaught ? 'Gefangen' : 'Versteckt'}</span>}
              {isSeeker && (
                <p className="text-game-muted text-xs mt-0.5">{caughtCount} von {hiders.length} gefangen</p>
              )}
            </div>
            {game?.endsAt && (
              <div className="text-right">
                <p className="text-game-muted text-xs">Verbleibend</p>
                <Countdown endsAt={game.endsAt} className="text-game-text font-bold text-lg" onComplete={() => {}} />
              </div>
            )}
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(13,17,23,0.75)' }} className="text-game-muted text-xs text-center py-1">
          Halte die App geöffnet für GPS-Tracking
        </div>
      </div>

      {/* CATCH BUTTON — appears when seeker is close enough to a hider */}
      {isSeeker && catchableHider && (
        <div style={{ position: 'absolute', bottom: 32, left: 16, right: 16, zIndex: 1000 }}>
          <button
            onClick={handleCatch}
            disabled={catching}
            style={{
              width: '100%',
              padding: '20px 24px',
              backgroundColor: catching ? '#991B1B' : '#EF4444',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'background-color 0.15s',
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
              {catching ? 'Wird gefangen...' : '🎯 FANGEN!'}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {catchableHider.name} — {catchableHider.distance} m entfernt
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  const { sessionId } = useParams();
  return (
    <GameProvider sessionId={sessionId}>
      <GameContent />
    </GameProvider>
  );
}
