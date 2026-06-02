import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, update, set, remove } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useGPS } from '../hooks/useGPS';
import { usePings } from '../hooks/usePings';
import { useAntiCamping } from '../hooks/useAntiCamping';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSession } from '../hooks/useSession';
import { useShrinkZone } from '../hooks/useShrinkZone';
import { pointInPolygon } from '../utils/pointInPolygon';
import { haversine } from '../utils/haversine';
import { db } from '../firebase';
import GameMap from '../components/Map/GameMap';
import Countdown from '../components/UI/Countdown';

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
        <p className="text-game-muted text-sm mb-4">Der Spieler bekommt eine Bestätigungsanfrage.</p>
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

function CatchConfirmModal({ request, onConfirm, onDeny, isZombieMode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{isZombieMode ? '🧟' : '👀'}</div>
        <h2 className="text-game-text text-xl font-bold mb-2">
          {isZombieMode ? 'Wurdest du gebissen?' : 'Wurdest du gefunden?'}
        </h2>
        <p className="text-game-muted text-sm mb-6">
          <span className="text-game-blue font-semibold">{request.seekerName}</span>{' '}
          {isZombieMode
            ? 'hat dich erwischt! Du wirst zum Zombie und jagst jetzt deine ehemaligen Mitspieler.'
            : 'behauptet, dich gefunden zu haben. Stimmt das?'}
        </p>
        <div className="flex gap-3">
          <button onClick={onDeny}
            style={{ flex: 1, padding: '14px', backgroundColor: '#0D1117', border: '1px solid #30363D', borderRadius: 12, color: '#8B949E', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Nein
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '14px', backgroundColor: isZombieMode ? '#A855F7' : '#EF4444', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {isZombieMode ? 'Ja, ich bin Zombie! 🧟' : 'Ja, gefangen!'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GameContent() {
  const { sessionId } = useParams();
  const { meta, players, zone, game, pings, catchRequests, stats, shrinkZones, loading } = useGame();
  const { user } = useAuth();
  const { updatePlayerStats } = useSession();
  const navigate = useNavigate();

  const [outOfZone, setOutOfZone] = useState(false);
  const [showCatchMenu, setShowCatchMenu] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [placingDecoy, setPlacingDecoy] = useState(false);
  const [decoyError, setDecoyError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showCaughtFlash, setShowCaughtFlash] = useState(false);
  const [showZombieFlash, setShowZombieFlash] = useState(false);
  const [shrinkGrace, setShrinkGrace] = useState(false);

  // Tick every second for shrink countdown + camping warning
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Refs for stats & distance tracking (avoid re-renders)
  const distTrackerRef = useRef(0);
  const prevPosRef = useRef(null);
  const statsUpdatedRef = useRef(false);
  const myPlayerRef = useRef(null);
  const statsRef = useRef(null);
  const prevCaughtRef = useRef(false);
  const prevIsZombieRef = useRef(false);
  const prevShrinkStepRef = useRef(null); // null = uninitialized (avoids false-positive grace on join)

  const isZombieMode = meta?.gameMode === 'zombie';
  const isShrinkMode = meta?.gameMode === 'shrink';
  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';
  const isCaught = myPlayer?.caught;
  const isZombie = myPlayer?.zombie === true;
  const currentShrinkStep = game?.currentShrinkStep || 0;
  // Use the current shrink zone for out-of-zone detection; fall back to original zone
  const activeZone = isShrinkMode && shrinkZones ? shrinkZones[currentShrinkStep] : zone;

  // Keep refs current
  myPlayerRef.current = myPlayer;
  statsRef.current = stats;

  const { position } = useGPS(sessionId, user.uid, true);
  usePings(sessionId, players, user.uid, myPlayer?.role, meta?.status === 'playing');
  useShrinkZone(sessionId, game, shrinkZones?.length || 0, myPlayer?.role, isShrinkMode && meta?.status === 'playing');

  // Anti-camping: only active when ping interval is 3 min or longer
  const antiCampingActive = meta?.status === 'playing' && (meta?.settings?.pingInterval ?? 3) >= 3;
  useAntiCamping(sessionId, players, myPlayer?.role, antiCampingActive);

  useWakeLock(true);

  // Accumulate distance during 'playing' phase only
  useEffect(() => {
    if (!position || meta?.status !== 'playing') return;
    if (prevPosRef.current) {
      const d = haversine(position.lat, position.lng, prevPosRef.current.lat, prevPosRef.current.lng);
      if (d > 2) distTrackerRef.current += d;
    }
    prevPosRef.current = position;
  }, [position?.lat, position?.lng, meta?.status]);

  // Navigate to end screen + update stats + vibrate on game end
  useEffect(() => {
    if (!loading && meta?.status === 'ended') {
      if (!statsUpdatedRef.current) {
        statsUpdatedRef.current = true;
        updatePlayerStats(user.uid, myPlayerRef.current, statsRef.current, distTrackerRef.current);
      }
      navigate(`/game/${sessionId}/end`, { replace: true });
    }
  }, [meta?.status, loading]);

  // Watch for catch requests (hiders)
  useEffect(() => {
    if (isSeeker || isCaught || !catchRequests) { setPendingRequest(null); return; }
    setPendingRequest(catchRequests[user.uid] || null);
  }, [catchRequests, isSeeker, isCaught, user.uid]);

  // Out-of-zone detection (uses current shrink step; grace period disables penalty)
  useEffect(() => {
    if (!position || !activeZone) return;
    if (isShrinkMode && shrinkGrace) { setOutOfZone(false); return; }
    setOutOfZone(!pointInPolygon(position.lat, position.lng, activeZone));
  }, [position, activeZone, shrinkGrace, isShrinkMode]);

  // Flash when hider gets caught (classic mode)
  useEffect(() => {
    if (!isSeeker && isCaught && !prevCaughtRef.current) {
      setShowCaughtFlash(true);
      setTimeout(() => setShowCaughtFlash(false), 1600);
    }
    prevCaughtRef.current = !!isCaught;
  }, [isCaught, isSeeker]);

  // Green flash when hider becomes a zombie
  useEffect(() => {
    if (isZombie && !prevIsZombieRef.current) {
      setShowZombieFlash(true);
      setTimeout(() => setShowZombieFlash(false), 1600);
    }
    prevIsZombieRef.current = !!isZombie;
  }, [isZombie]);

  // 10-second grace period after each zone shrink
  useEffect(() => {
    if (!isShrinkMode) return;
    const step = game?.currentShrinkStep || 0;
    if (prevShrinkStepRef.current === null) {
      prevShrinkStepRef.current = step;
      return;
    }
    if (step > prevShrinkStepRef.current) {
      prevShrinkStepRef.current = step;
      setShrinkGrace(true);
      setTimeout(() => setShrinkGrace(false), 10_000);
    }
  }, [game?.currentShrinkStep, isShrinkMode]);

  // Game-end timer
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

  async function handleClaim(hider) {
    await set(ref(db, `sessions/${sessionId}/catchRequests/${hider.uid}`), {
      seekerUid: user.uid,
      seekerName: myPlayer?.name || 'Seeker',
      timestamp: Date.now(),
    });
  }

  async function handleConfirmCatch() {
    const now = Date.now();
    if (isZombieMode) {
      // Convert hider into a zombie seeker
      await update(ref(db, `sessions/${sessionId}/players/${user.uid}`), {
        role: 'seeker',
        zombie: true,
        caughtAt: now,
        caughtBy: pendingRequest.seekerUid,
      });
      await remove(ref(db, `sessions/${sessionId}/catchRequests/${user.uid}`));
      // Game ends when no free hiders remain (exclude self, already converted)
      const remainingHiders = players.filter((p) => p.role === 'hider' && p.uid !== user.uid);
      if (remainingHiders.length === 0) await handleGameEnd('seeker');
    } else {
      await update(ref(db, `sessions/${sessionId}/players/${user.uid}`), {
        caught: true, caughtAt: now, caughtBy: pendingRequest.seekerUid,
      });
      await remove(ref(db, `sessions/${sessionId}/catchRequests/${user.uid}`));
      const allHiders = players.filter((p) => p.role === 'hider');
      const allCaught = allHiders.every((p) => p.uid === user.uid || p.caught);
      if (allCaught) await handleGameEnd('seeker');
    }
  }

  async function handleDenyCatch() {
    await remove(ref(db, `sessions/${sessionId}/catchRequests/${user.uid}`));
  }

  // Decoy placement
  async function handleDecoyPlace({ lat, lng }) {
    if (!pointInPolygon(lat, lng, zone)) {
      setDecoyError('Position muss innerhalb der Spielzone liegen.');
      setTimeout(() => setDecoyError(''), 3000);
      return;
    }
    // Queue the fake position — sent on the next regular ping instead of real position
    await update(ref(db, `sessions/${sessionId}/players/${user.uid}`), {
      usedDecoy: true,
      decoyPingTimestamp: Date.now(),
      queuedDecoy: { lat, lng },
    });
    setPlacingDecoy(false);
  }

  if (loading || !meta) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Camping warning: show after 2 min still (1 min before ping fires at 3 min)
  const antiCampingEnabled = (meta?.settings?.pingInterval ?? 3) >= 3;
  const campingWarning = !isSeeker && !isCaught && antiCampingEnabled &&
    myPlayer?.lastMovedAt != null && (now - myPlayer.lastMovedAt) > 120_000;

  const hiders = players.filter((p) => p.role === 'hider');
  const caughtCount = hiders.filter((p) => p.caught).length;
  const uncaughtHiders = hiders.filter((p) => !p.caught);

  const outOfZoneHiders = activeZone
    ? hiders.filter((p) => !p.caught && p.lat != null && p.lng != null && !pointInPolygon(p.lat, p.lng, activeZone))
    : [];
  const outOfZoneSeekers = activeZone
    ? players.filter((p) => p.role === 'seeker' && p.lat != null && p.lng != null && !pointInPolygon(p.lat, p.lng, activeZone))
    : [];
  const outOfZoneUids = [
    ...outOfZoneHiders.map((p) => p.uid),
    ...outOfZoneSeekers.map((p) => p.uid),
  ];

  const mapPlayers = isSeeker
    ? [
        ...players.filter((p) => p.role === 'seeker'),
        ...players.filter((p) => p.role === 'hider' && (p.caught || outOfZoneUids.includes(p.uid))),
      ]
    : [
        ...players.filter((p) => p.uid === user.uid),
        ...outOfZoneSeekers,
      ];

  const zoneCenter = zone && zone.length > 0
    ? [zone.reduce((s, p) => s + p.lat, 0) / zone.length, zone.reduce((s, p) => s + p.lng, 0) / zone.length]
    : null;

  const myPendingClaim = isSeeker && catchRequests
    ? Object.entries(catchRequests).find(([, req]) => req.seekerUid === user.uid)
    : null;

  const maxShrinkStep = (shrinkZones?.length ?? 1) - 1;
  const shrinkSecondsLeft = isShrinkMode && game?.nextShrinkAt && currentShrinkStep < maxShrinkStep
    ? Math.max(0, Math.ceil((game.nextShrinkAt - now) / 1000))
    : null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {showCaughtFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.55) 0%, rgba(239,68,68,0.2) 70%)',
          animation: 'caughtFlash 1.6s ease-out forwards',
        }} />
      )}
      {showZombieFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.55) 0%, rgba(168,85,247,0.2) 70%)',
          animation: 'caughtFlash 1.6s ease-out forwards',
        }} />
      )}
      <GameMap
        center={zoneCenter}
        zone={zone}
        players={mapPlayers}
        outOfZonePlayers={outOfZoneUids}
        pings={isSeeker ? pings : null}
        myUid={user.uid}
        showPlayers
        showPings={isSeeker}
        onMapClick={placingDecoy ? handleDecoyPlace : null}
        shrinkZones={isShrinkMode ? shrinkZones : null}
        currentShrinkStep={currentShrinkStep}
        gracePeriodActive={isShrinkMode && shrinkGrace}
      />

      {/* Top UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }} className="pt-safe">
        {outOfZone && !isCaught && (
          <div className="bg-game-red text-white text-center py-2 text-sm font-bold">
            Du verlässt die Spielzone! Kehre zurück.
          </div>
        )}
        {isShrinkMode && shrinkGrace && (
          <div style={{
            backgroundColor: 'rgba(239,68,68,0.95)', color: 'white',
            textAlign: 'center', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700,
            animation: 'countdownPulse 1.2s ease-in-out infinite',
          }}>
            ⚠️ Zone schrumpft! 10 Sekunden Gnadenfrist
          </div>
        )}
        {shrinkSecondsLeft !== null && !shrinkGrace && (
          <div style={{
            backgroundColor: 'rgba(249,115,22,0.92)', color: 'white',
            textAlign: 'center', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
          }}>
            🌀 Zone schrumpft in {Math.floor(shrinkSecondsLeft / 60)}:{String(shrinkSecondsLeft % 60).padStart(2, '0')}
          </div>
        )}
        {campingWarning && (
          <div style={{
            backgroundColor: 'rgba(234,179,8,0.92)',
            color: '#0D1117',
            textAlign: 'center',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            animation: 'countdownPulse 1.2s ease-in-out infinite',
          }}>
            ⚠️ Du campst zu lange — beweg dich, sonst wirst du geortet!
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
              {isSeeker && isZombieMode && isZombie
                ? <span style={{ color: '#A855F7' }} className="text-xs font-bold uppercase tracking-wide">Zombie 🧟</span>
                : isSeeker
                ? <span className="text-game-red text-xs font-bold uppercase tracking-wide">Seeker</span>
                : <span className="text-game-green text-xs font-bold uppercase tracking-wide">{isCaught ? 'Gefangen' : 'Versteckt'}</span>}
              {isSeeker && (
                <p className="text-game-muted text-xs mt-0.5">
                  {isZombieMode
                    ? `${uncaughtHiders.length} Hider noch frei`
                    : `${caughtCount} von ${hiders.length} gefangen`}
                </p>
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

      {/* SEEKER: Catch button (bottom right) */}
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

      {/* HIDER: Decoy button (bottom left) */}
      {!isSeeker && !isCaught && (
        <div style={{ position: 'absolute', bottom: 28, left: 20, zIndex: 1000 }}>
          {!myPlayer?.usedDecoy ? (
            !placingDecoy ? (
              <button
                onClick={() => setPlacingDecoy(true)}
                style={{
                  backgroundColor: '#A855F7', border: 'none', borderRadius: 20,
                  padding: '14px 20px', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>🎭</span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Köder senden</span>
              </button>
            ) : (
              <button
                onClick={() => { setPlacingDecoy(false); setDecoyError(''); }}
                style={{
                  backgroundColor: 'rgba(13,17,23,0.95)', border: '1px solid #A855F7',
                  borderRadius: 16, padding: '12px 16px', cursor: 'pointer',
                  color: '#A855F7', fontWeight: 600, fontSize: 13,
                }}
              >
                Abbrechen ✕
              </button>
            )
          ) : (
            <div style={{
              backgroundColor: 'rgba(13,17,23,0.8)', border: '1px solid #30363D',
              borderRadius: 16, padding: '8px 12px',
            }}>
              <p style={{ color: '#8B949E', fontSize: 11 }}>Köder bereits verwendet</p>
            </div>
          )}
        </div>
      )}

      {/* Decoy placement instruction */}
      {placingDecoy && (
        <div style={{
          position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1001, backgroundColor: 'rgba(13,17,23,0.95)', border: '1px solid #A855F7',
          borderRadius: 12, padding: '10px 16px', whiteSpace: 'nowrap',
        }}>
          <p style={{ color: '#A855F7', fontSize: 13, fontWeight: 600 }}>
            Tippe auf die Karte für deinen Köder-Ping
          </p>
          {decoyError && (
            <p style={{ color: '#EF4444', fontSize: 11, marginTop: 4, textAlign: 'center' }}>
              {decoyError}
            </p>
          )}
        </div>
      )}

      {showCatchMenu && (
        <CatchMenu uncaughtHiders={uncaughtHiders} onClaim={handleClaim} onClose={() => setShowCatchMenu(false)} />
      )}

      {pendingRequest && (
        <CatchConfirmModal request={pendingRequest} onConfirm={handleConfirmCatch} onDeny={handleDenyCatch} isZombieMode={isZombieMode} />
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
