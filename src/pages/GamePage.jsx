import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, update, set, remove } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useGPS } from '../hooks/useGPS';
import { usePings } from '../hooks/usePings';
import { useWakeLock } from '../hooks/useWakeLock';
import { pointInPolygon } from '../utils/pointInPolygon';
import { db } from '../firebase';
import GameMap from '../components/Map/GameMap';
import Countdown from '../components/UI/Countdown';

// Seeker opens this to claim they found someone
function CatchMenu({ uncaughtHiders, onClaim, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }} onClick={onClose} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
        backgroundColor: '#161B22', borderTop: '1px solid #30363D',
        borderRadius: '20px 20px 0 0', padding: '20px 16px 40px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#30363D', margin: '0 auto 16px' }} />
        <h2 className="text-game-text font-bold text-lg mb-1">Wen hast du gefunden?</h2>
        <p className="text-game-muted text-sm mb-4">
          Der Spieler bekommt eine Bestätigungsanfrage.
        </p>
        <div className="flex flex-col gap-3">
          {uncaughtHiders.map((hider) => (
            <button
              key={hider.uid}
              onClick={() => { onClaim(hider); onClose(); }}
              style={{
                backgroundColor: '#0D1117', border: '1px solid #30363D',
                borderRadius: 16, padding: '16px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', backgroundColor: '#3B82F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {(hider.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-game-text font-semibold">{hider.name}</p>
                <p className="text-game-muted text-xs">Anfrage senden →</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-3 text-game-muted text-sm cursor-pointer">Abbrechen</button>
      </div>
    </>
  );
}

// Hider sees this when a seeker claims to have found them
function CatchConfirmModal({ request, onConfirm, onDeny }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
        <h2 className="text-game-text text-xl font-bold mb-2">Wurdest du gefunden?</h2>
        <p className="text-game-muted text-sm mb-6">
          <span className="text-game-blue font-semibold">{request.seekerName}</span> behauptet, dich gefunden zu haben. Stimmt das?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDeny}
            style={{ flex: 1, padding: '14px', backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: 12, color: '#8B949E', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Nein
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '14px', backgroundColor: '#EF4444', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Ja, gefangen!
          </button>
        </div>
      </div>
    </div>
  );
}

function GameContent() {
  const { sessionId } = useParams();
  const { meta, players, zone, game, pings, catchRequests, loading } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [outOfZone, setOutOfZone] = useState(false);
  const [showCatchMenu, setShowCatchMenu] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null); // request waiting for this hider

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

  // Watch for incoming catch requests (for hiders)
  useEffect(() => {
    if (isSeeker || isCaught || !catchRequests) {
      setPendingRequest(null);
      return;
    }
    const req = catchRequests[user.uid];
    setPendingRequest(req || null);
  }, [catchRequests, isSeeker, isCaught, user.uid]);

  useEffect(() => {
    if (!position || !zone) return;
    setOutOfZone(!pointInPolygon(position.lat, position.lng, zone));
  }, [position, zone]);

  async function handleGameEnd(winner) {
    if (meta?.status !== 'playing') return;
    await update(ref(db, `sessions/${sessionId}`), {
      'meta/status': 'ended',
      'stats/endedAt': Date.now(),
      'stats/winner': winner,
    });
  }

  // Seeker sends a catch claim to a hider
  async function handleClaim(hider) {
    await set(ref(db, `sessions/${sessionId}/catchRequests/${hider.uid}`), {
      seekerUid: user.uid,
      seekerName: myPlayer?.name || 'Seeker',
      timestamp: Date.now(),
    });
  }

  // Hider confirms they were caught
  async function handleConfirmCatch() {
    const now = Date.now();
    await update(ref(db, `sessions/${sessionId}/players/${user.uid}`), {
      caught: true, caughtAt: now, caughtBy: pendingRequest.seekerUid,
    });
    await remove(ref(db, `sessions/${sessionId}/catchRequests/${user.uid}`));

    // Check if all hiders are now caught → end game
    const allHiders = players.filter((p) => p.role === 'hider');
    const allCaught = allHiders.every((p) => p.uid === user.uid || p.caught);
    if (allCaught) await handleGameEnd('seeker');
  }

  // Hider denies the claim
  async function handleDenyCatch() {
    await remove(ref(db, `sessions/${sessionId}/catchRequests/${user.uid}`));
  }

  if (loading || !meta) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hiders = players.filter((p) => p.role === 'hider');
  const caughtCount = hiders.filter((p) => p.caught).length;
  const uncaughtHiders = hiders.filter((p) => !p.caught);

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

  // Check if this seeker already has a pending request out
  const myPendingClaim = isSeeker && catchRequests
    ? Object.entries(catchRequests).find(([, req]) => req.seekerUid === user.uid)
    : null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <GameMap
        center={zoneCenter}
        zone={zone}
        players={mapPlayers}
        outOfZonePlayers={outOfZoneUids}
        pings={isSeeker ? pings : null}
        myUid={user.uid}
        showPlayers
        showPings={isSeeker}
      />

      {/* Top UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }} className="pt-safe">
        {outOfZone && !isCaught && (
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
              {isSeeker && <p className="text-game-muted text-xs mt-0.5">{caughtCount} von {hiders.length} gefangen</p>}
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

      {/* SEEKER: Catch button (bottom right FAB) */}
      {isSeeker && uncaughtHiders.length > 0 && (
        <div style={{ position: 'absolute', bottom: 28, right: 20, zIndex: 1000 }}>
          {myPendingClaim ? (
            <div style={{
              backgroundColor: 'rgba(13,17,23,0.95)', border: '1px solid #30363D',
              borderRadius: 16, padding: '12px 16px', textAlign: 'center', maxWidth: 180,
            }}>
              <p className="text-game-muted text-xs">Warte auf Bestätigung von</p>
              <p className="text-game-text text-sm font-bold mt-0.5">
                {players.find((p) => p.uid === myPendingClaim[0])?.name}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowCatchMenu(true)}
              style={{
                backgroundColor: '#EF4444', border: 'none', borderRadius: 20,
                padding: '14px 20px', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>🎯</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Fangen</span>
            </button>
          )}
        </div>
      )}

      {/* Seeker: player selection menu */}
      {showCatchMenu && (
        <CatchMenu
          uncaughtHiders={uncaughtHiders}
          onClaim={handleClaim}
          onClose={() => setShowCatchMenu(false)}
        />
      )}

      {/* Hider: incoming catch request modal */}
      {pendingRequest && (
        <CatchConfirmModal
          request={pendingRequest}
          onConfirm={handleConfirmCatch}
          onDeny={handleDenyCatch}
        />
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
