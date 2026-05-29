import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

function KickModal({ reason, sessionCode, onConfirm }) {
  const isDisconnect = reason === 'disconnect';
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="bg-game-card border border-game-border rounded-2xl p-6 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">{isDisconnect ? '📶' : '🚪'}</div>
        <h2 className="text-game-text text-xl font-bold mb-2">
          {isDisconnect ? 'Verbindung unterbrochen' : 'Lobby geschlossen'}
        </h2>
        <p className="text-game-muted text-sm mb-6">
          {isDisconnect
            ? 'Die Verbindung zum Server wurde unterbrochen. Du kannst versuchen, der Session erneut beizutreten.'
            : 'Der Host hat die Lobby geschlossen.'}
        </p>
        {isDisconnect && sessionCode && (
          <p className="text-game-blue text-sm font-bold mb-4">Code: {sessionCode}</p>
        )}
        <Button onClick={onConfirm}>Zur Startseite</Button>
      </div>
    </div>
  );
}

function assignRandomRoles(players) {
  const uids = players.map((p) => p.uid);
  const shuffled = [...uids].sort(() => Math.random() - 0.5);
  const roles = {};
  // At least 1 seeker — first player in shuffled list gets seeker, others hider
  // For larger groups: roughly 1 seeker per 3 players (min 1)
  const seekerCount = Math.max(1, Math.floor(uids.length / 3));
  shuffled.forEach((uid, i) => {
    roles[uid] = i < seekerCount ? 'seeker' : 'hider';
  });
  return roles;
}

function LobbyContent() {
  const { sessionId } = useParams();
  const { meta, players, loading } = useGame();
  const { user } = useAuth();
  const { startGame, setPlayerRole } = useSession();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [randomRoles, setRandomRoles] = useState(false);
  const [kickReason, setKickReason] = useState(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      const isConnected = snap.val();
      if (connectedRef.current && !isConnected && !kickReason) setKickReason('disconnect');
      connectedRef.current = !!isConnected;
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!loading && meta?.status === 'hiding') navigate(`/game/${sessionId}/role-reveal`, { replace: true });
    if (!loading && meta?.status === 'playing') navigate(`/game/${sessionId}/play`, { replace: true });
    if (!loading && meta?.status === 'ended') navigate(`/game/${sessionId}/end`, { replace: true });
    if (!loading && meta?.status === 'closed' && meta?.host !== user.uid) setKickReason('closed');
    if (!loading && !meta && connectedRef.current) setKickReason('disconnect');
  }, [meta?.status, loading]);

  if (loading || (!meta && !kickReason)) {
    return <div className="flex items-center justify-center h-full bg-game-bg"><div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (kickReason) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <KickModal
          reason={kickReason}
          sessionCode={meta?.code}
          onConfirm={() => navigate('/home', { replace: true })}
        />
      </div>
    );
  }

  const isHost = meta.host === user.uid;
  const inviteLink = `${window.location.origin}/join/${meta.code}`;
  const hiders = players.filter((p) => p.role === 'hider');
  const seekers = players.filter((p) => p.role === 'seeker');
  const canStart = randomRoles ? players.length >= 2 : (hiders.length >= 1 && seekers.length >= 1);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    setStarting(true);
    try {
      const roleAssignments = randomRoles ? assignRandomRoles(players) : null;
      await startGame(sessionId, meta.settings, roleAssignments);
      navigate(`/game/${sessionId}/role-reveal`);
    } catch {
      setStarting(false);
    }
  }

  async function handleHostLeave() {
    await set(ref(db, `sessions/${sessionId}/meta/status`), 'closed');
    navigate('/home', { replace: true });
  }

  return (
    <div className="flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={isHost ? handleHostLeave : () => navigate('/home')}
          className="text-game-muted hover:text-game-text cursor-pointer text-xl"
        >←</button>
        <h1 className="text-game-text font-bold text-xl">Lobby</h1>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <Card className="text-center">
          <p className="text-game-muted text-sm mb-1">Session-Code</p>
          <p className="text-game-text text-4xl font-black tracking-widest">{meta.code}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-game-muted text-xs truncate">{inviteLink}</p>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                copied ? 'bg-game-green/20 border-game-green text-game-green' : 'border-game-border text-game-muted hover:border-game-blue'
              }`}
            >
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between text-game-muted text-xs">
            <span>⏱ {meta.settings?.gameDuration} Min</span>
            <span>📡 Ping alle {meta.settings?.pingInterval} Min</span>
            <span>🎯 {meta.settings?.catchRadius} m</span>
          </div>
        </Card>

        {/* Random roles toggle — host only */}
        {isHost && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-game-text text-sm font-semibold">Zufällige Rollen</p>
                <p className="text-game-muted text-xs mt-0.5">
                  {randomRoles ? 'Rollen werden beim Start zufällig vergeben' : 'Rollen manuell zuweisen'}
                </p>
              </div>
              <button
                onClick={() => setRandomRoles((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${randomRoles ? 'bg-game-blue' : 'bg-game-border'}`}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
                  style={{ transform: randomRoles ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-game-text font-bold mb-3">Spieler ({players.length})</h2>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div key={p.uid} className="flex items-center justify-between py-2 border-b border-game-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-game-blue flex items-center justify-center text-white text-xs font-bold">
                    {(p.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-game-text text-sm font-medium">
                    {p.name}
                    {p.uid === meta.host && <span className="ml-1 text-game-blue text-xs">👑</span>}
                    {p.uid === user.uid && <span className="ml-1 text-game-muted text-xs">(du)</span>}
                  </span>
                </div>

                {randomRoles ? (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full border border-game-border text-game-muted">
                    ???
                  </span>
                ) : isHost ? (
                  <select
                    value={p.role || 'hider'}
                    onChange={(e) => setPlayerRole(sessionId, p.uid, e.target.value)}
                    className="bg-game-bg border border-game-border rounded-lg px-2 py-1 text-xs text-game-text focus:outline-none focus:border-game-blue cursor-pointer"
                  >
                    <option value="hider">Hider</option>
                    <option value="seeker">Seeker</option>
                  </select>
                ) : (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                    p.role === 'seeker' ? 'border-game-red text-game-red' : 'border-game-green text-game-green'
                  }`}>
                    {p.role === 'seeker' ? 'Seeker' : 'Hider'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        {isHost ? (
          <div className="flex flex-col gap-2">
            {!canStart && (
              <p className="text-game-muted text-xs text-center mb-1">
                {randomRoles ? 'Mind. 2 Spieler erforderlich' : 'Mind. 1 Hider und 1 Seeker erforderlich'}
              </p>
            )}
            <Button onClick={handleStart} disabled={!canStart || starting}>
              {starting ? 'Spiel wird gestartet...' : 'Spiel starten'}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-game-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-game-muted text-sm">Warten auf Host...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LobbyPage() {
  const { sessionId } = useParams();
  return (
    <GameProvider sessionId={sessionId}>
      <LobbyContent />
    </GameProvider>
  );
}
