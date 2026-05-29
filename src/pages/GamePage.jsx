import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set, update } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useGPS } from '../hooks/useGPS';
import { usePings } from '../hooks/usePings';
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
  const catchCheckRef = useRef(null);

  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';
  const isCaught = myPlayer?.caught;

  const { position } = useGPS(sessionId, user.uid, true);

  usePings(sessionId, players, user.uid, myPlayer?.role, meta?.status === 'playing');

  useEffect(() => {
    if (!loading && meta?.status === 'ended') {
      navigate(`/game/${sessionId}/end`, { replace: true });
    }
  }, [meta?.status, loading]);

  // Game timer end check
  useEffect(() => {
    if (!game?.endsAt) return;
    const remaining = game.endsAt - Date.now();
    if (remaining <= 0) {
      handleGameEnd('hider');
      return;
    }
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

  // Seeker catch-check
  useEffect(() => {
    if (!isSeeker || !position || !meta?.settings) return;

    catchCheckRef.current = setInterval(async () => {
      const uncaught = players.filter((p) => p.role === 'hider' && !p.caught && p.lat != null && p.lng != null);
      for (const hider of uncaught) {
        const dist = haversine(position.lat, position.lng, hider.lat, hider.lng);
        if (dist < meta.settings.catchRadius) {
          const now = Date.now();
          await update(ref(db, `sessions/${sessionId}/players/${hider.uid}`), {
            caught: true,
            caughtAt: now,
            caughtBy: user.uid,
          });

          const allHiders = players.filter((p) => p.role === 'hider');
          const allCaught = allHiders.every((p) => p.uid === hider.uid || p.caught);
          if (allCaught) {
            await handleGameEnd('seeker');
          }
        }
      }
    }, 2000);

    return () => clearInterval(catchCheckRef.current);
  }, [isSeeker, position, players, meta?.settings]);

  // Zone exit check
  useEffect(() => {
    if (!position || !zone) return;
    const inside = pointInPolygon(position.lat, position.lng, zone);
    setOutOfZone(!inside);
  }, [position, zone]);

  if (loading || !meta) {
    return <div className="flex items-center justify-center h-full bg-game-bg"><div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const hiders = players.filter((p) => p.role === 'hider');
  const caughtCount = hiders.filter((p) => p.caught).length;

  const mapPlayers = isSeeker
    ? [
        ...players.filter((p) => p.role === 'seeker'),
        ...players.filter((p) => p.role === 'hider' && p.caught),
      ]
    : players.filter((p) => p.uid === user.uid);

  const zoneCenter = zone && zone.length > 0
    ? [zone.reduce((s, p) => s + p.lat, 0) / zone.length, zone.reduce((s, p) => s + p.lng, 0) / zone.length]
    : null;

  const mapCenter = position ? [position.lat, position.lng] : zoneCenter;

  return (
    <div className="map-screen flex flex-col">
      {outOfZone && (
        <div className="z-20 bg-game-red text-white text-center py-2 text-sm font-bold shrink-0">
          Du verlässt die Spielzone! Kehre zurück.
        </div>
      )}

      <div className="z-10 bg-game-bg/95 backdrop-blur px-4 py-3 shrink-0 border-b border-game-border">
        <div className="flex items-center justify-between">
          <div>
            {isSeeker ? (
              <span className="text-game-red text-xs font-bold uppercase tracking-wide">Seeker</span>
            ) : (
              <span className="text-game-green text-xs font-bold uppercase tracking-wide">
                {isCaught ? 'Gefangen' : 'Versteckt'}
              </span>
            )}
            {isSeeker && (
              <p className="text-game-muted text-xs mt-0.5">{caughtCount} von {hiders.length} gefangen</p>
            )}
          </div>

          {game?.endsAt && (
            <div className="text-right">
              <p className="text-game-muted text-xs">Verbleibend</p>
              <Countdown
                endsAt={game.endsAt}
                className="text-game-text font-bold text-lg"
                onComplete={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {isCaught && !isSeeker && (
        <div className="z-10 bg-game-red/20 border-b border-game-red px-4 py-2 text-game-red text-sm text-center font-semibold shrink-0">
          Du wurdest gefangen!
        </div>
      )}

      <div className="text-game-muted text-xs text-center py-1 bg-game-bg/80 shrink-0">
        Halte die App geöffnet für GPS-Tracking
      </div>

      <div className="flex-1 relative min-h-0">
        <GameMap
          center={mapCenter}
          zone={zone}
          players={mapPlayers}
          pings={isSeeker ? pings : null}
          myUid={user.uid}
          showPlayers
          showPings={isSeeker}
        />
      </div>
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
