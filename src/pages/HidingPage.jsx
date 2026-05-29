import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useGPS } from '../hooks/useGPS';
import GameMap from '../components/Map/GameMap';
import Countdown from '../components/UI/Countdown';

function HidingContent() {
  const { sessionId } = useParams();
  const { meta, players, zone, game, loading } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();

  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';

  useGPS(sessionId, user.uid, true);

  useEffect(() => {
    if (!loading && meta?.status === 'playing') {
      navigate(`/game/${sessionId}/play`, { replace: true });
    }
    if (!loading && meta?.status === 'ended') {
      navigate(`/game/${sessionId}/end`, { replace: true });
    }
  }, [meta?.status, loading]);

  async function handleCountdownComplete() {
    if (meta?.host === user.uid) {
      await set(ref(db, `sessions/${sessionId}/meta/status`), 'playing');
    }
    navigate(`/game/${sessionId}/play`, { replace: true });
  }

  if (loading || !game) {
    return <div className="flex items-center justify-center h-full bg-game-bg"><div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const zoneCenter = zone && zone.length > 0
    ? [zone.reduce((s, p) => s + p.lat, 0) / zone.length, zone.reduce((s, p) => s + p.lng, 0) / zone.length]
    : null;

  return (
    <div className="map-screen flex flex-col">
      <div className="z-10 bg-game-bg/95 backdrop-blur px-4 py-4 shrink-0 text-center border-b border-game-border">
        {isSeeker ? (
          <>
            <p className="text-game-muted text-xs mb-1">Hider verstecken sich</p>
            <div className="text-game-red text-3xl font-black">
              <Countdown endsAt={game.hidingEndsAt} onComplete={handleCountdownComplete} />
            </div>
            <p className="text-game-muted text-sm mt-1">Warte bis der Timer abläuft...</p>
          </>
        ) : (
          <>
            <p className="text-game-green font-bold mb-1">Versteckt euch! Ihr habt noch</p>
            <div className="text-game-green text-3xl font-black">
              <Countdown endsAt={game.hidingEndsAt} onComplete={handleCountdownComplete} />
            </div>
            <p className="text-game-muted text-xs mt-1">Halte die App geöffnet für GPS-Tracking!</p>
          </>
        )}
      </div>

      <div className="flex-1">
        <GameMap
          center={zoneCenter}
          zone={zone}
          players={[]}
          myUid={user.uid}
          showPlayers={false}
        />
      </div>
    </div>
  );
}

export default function HidingPage() {
  const { sessionId } = useParams();
  return (
    <GameProvider sessionId={sessionId}>
      <HidingContent />
    </GameProvider>
  );
}
