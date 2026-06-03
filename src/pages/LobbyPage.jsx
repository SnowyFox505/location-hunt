import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set, remove, onValue } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const GAME_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const HIDING_DURATION_OPTIONS = [1, 2, 3, 5, 10];

function KickModal({ reason, sessionCode, onConfirm }) {
  const isDisconnect = reason === 'disconnect';
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s ease both' }}>
      <div className="bg-game-card border border-game-border rounded-2xl p-6 w-full max-w-sm text-center" style={{ animation: 'scaleIn 0.25s ease both' }}>
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
  const { startGame, setPlayerRole, updateSettings, transferHost } = useSession();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [kickReason, setKickReason] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [newlyJoinedUids, setNewlyJoinedUids] = useState(new Set());
  const [showQr, setShowQr] = useState(false);
  const prevPlayerUidsRef = useRef(new Set());

  const randomRoles = !!meta?.randomRoles;
  const connectedRef = useRef(false);

  // Detect newly joined players and flash their row green
  useEffect(() => {
    const currentUids = new Set(players.map((p) => p.uid));
    const newUids = [...currentUids].filter((uid) => !prevPlayerUidsRef.current.has(uid));
    if (newUids.length > 0 && prevPlayerUidsRef.current.size > 0) {
      setNewlyJoinedUids(new Set(newUids));
      setTimeout(() => setNewlyJoinedUids(new Set()), 1500);
    }
    prevPlayerUidsRef.current = currentUids;
  }, [players.length]);

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
        <KickModal reason={kickReason} sessionCode={meta?.code} onConfirm={() => navigate('/home', { replace: true })} />
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
      await startGame(sessionId, meta.settings, roleAssignments, meta.gameMode);
      navigate(`/game/${sessionId}/role-reveal`);
    } catch {
      setStarting(false);
    }
  }

  async function handleHostLeave() {
    await set(ref(db, `sessions/${sessionId}/meta/status`), 'closed');
    localStorage.removeItem('lastSession');
    navigate('/home', { replace: true });
  }

  async function handlePlayerLeave() {
    await remove(ref(db, `sessions/${sessionId}/players/${user.uid}`));
    localStorage.removeItem('lastSession');
    navigate('/home', { replace: true });
  }

  function openEditSettings() {
    setLocalSettings({ ...meta.settings });
    setEditingSettings(true);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    await updateSettings(sessionId, localSettings);
    setSavingSettings(false);
    setEditingSettings(false);
  }

  async function handleTransferHost(newHostUid) {
    await transferHost(sessionId, newHostUid);
  }

  return (
    <div className="pt-safe flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={isHost ? handleHostLeave : handlePlayerLeave} className="text-game-muted hover:text-game-text cursor-pointer text-xl">←</button>
        <h1 className="text-game-text font-bold text-xl">Lobby</h1>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* Session code */}
        <Card className="text-center" style={{ animation: 'fadeInUp 0.4s ease both', opacity: 0 }}>
          <p className="text-game-muted text-sm mb-1">Session-Code</p>
          <p className="text-4xl font-black tracking-widest" style={{
            background: 'linear-gradient(90deg, #E6EDF3 0%, #93c5fd 45%, #E6EDF3 100%)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 3.5s ease-in-out infinite',
          }}>
            {meta.code}
          </p>
        </Card>

        {/* Invite link */}
        <Card style={{ animation: 'fadeInUp 0.4s 0.07s ease both', opacity: 0 }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-game-muted text-xs truncate">{inviteLink}</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleCopy} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${copied ? 'bg-game-green/20 border-game-green text-game-green' : 'border-game-border text-game-muted hover:border-game-blue'}`}>
                {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
              <button onClick={() => setShowQr(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-game-border text-game-muted hover:border-game-blue transition-colors cursor-pointer">
                QR
              </button>
            </div>
          </div>
        </Card>

        {/* Settings — with inline edit for host */}
        <Card style={{ animation: 'fadeInUp 0.4s 0.14s ease both', opacity: 0 }}>
          {!editingSettings ? (
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-game-muted text-xs flex-wrap">
                <span>
                  {meta.gameMode === 'zombie'     ? '🧟 Zombie'
                   : meta.gameMode === 'shrink'    ? '🌀 Schrumpfzone'
                   : meta.gameMode === 'ghost'     ? '👻 Unsichtbar'
                   : meta.gameMode === 'abilities' ? '⚡ Fähigkeiten'
                   : '🎮 Klassisch'}
                </span>
                <span>⏱ {meta.settings?.gameDuration} Min</span>
                <span>🙈 {meta.settings?.hidingDuration} Min</span>
                {meta.gameMode !== 'ghost' && <span>📡 Ping alle {meta.settings?.pingInterval} Min</span>}
              </div>
              {isHost && (
                <button onClick={openEditSettings} className="text-game-muted hover:text-game-blue transition-colors cursor-pointer ml-2 text-base shrink-0" title="Einstellungen bearbeiten">
                  ✏️
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4" style={{ animation: 'fadeInUp 0.2s ease both' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-game-text text-sm font-semibold">Einstellungen</p>
                <button onClick={() => setEditingSettings(false)} className="text-game-muted hover:text-game-text cursor-pointer text-sm">✕</button>
              </div>

              <div>
                <p className="text-game-muted text-xs mb-2">Spielzeit</p>
                <div className="flex flex-wrap gap-1.5">
                  {GAME_DURATION_OPTIONS.map((v) => (
                    <button key={v} onClick={() => setLocalSettings((s) => ({ ...s, gameDuration: v }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${localSettings.gameDuration === v ? 'bg-game-blue border-game-blue text-white' : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'}`}>
                      {v} Min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-game-muted text-xs mb-2">Versteckzeit</p>
                <div className="flex flex-wrap gap-1.5">
                  {HIDING_DURATION_OPTIONS.map((v) => (
                    <button key={v} onClick={() => setLocalSettings((s) => ({ ...s, hidingDuration: v }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${localSettings.hidingDuration === v ? 'bg-game-blue border-game-blue text-white' : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'}`}>
                      {v} Min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-game-muted text-xs mb-2">Ping-Intervall</p>
                <select
                  value={localSettings.pingInterval}
                  onChange={(e) => setLocalSettings((s) => ({ ...s, pingInterval: Number(e.target.value) }))}
                  className="w-full bg-game-bg border border-game-border rounded-lg px-3 py-2 text-game-text text-xs focus:outline-none focus:border-game-blue"
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>{v} Minute{v > 1 ? 'n' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveSettings} disabled={savingSettings}
                  className="flex-1 bg-game-blue text-white text-sm font-semibold py-2 rounded-xl cursor-pointer disabled:opacity-50 transition-opacity">
                  {savingSettings ? '…' : 'Speichern'}
                </button>
                <button onClick={() => setEditingSettings(false)}
                  className="flex-1 border border-game-border text-game-muted text-sm py-2 rounded-xl cursor-pointer hover:border-game-blue transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Random roles toggle */}
        {isHost && (
          <Card style={{ animation: 'fadeInUp 0.4s 0.21s ease both', opacity: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-game-text text-sm font-semibold">Zufällige Rollen</p>
                <p className="text-game-muted text-xs mt-0.5">
                  {randomRoles ? 'Rollen werden beim Start zufällig vergeben' : 'Rollen manuell zuweisen'}
                </p>
              </div>
              <button
                onClick={() => set(ref(db, `sessions/${sessionId}/meta/randomRoles`), !randomRoles)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${randomRoles ? 'bg-game-blue' : 'bg-game-border'}`}
              >
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
                  style={{ transform: randomRoles ? 'translateX(24px)' : 'translateX(0)' }} />
              </button>
            </div>
          </Card>
        )}

        {/* Players list */}
        <Card style={{ animation: 'fadeInUp 0.4s 0.28s ease both', opacity: 0 }}>
          <h2 className="text-game-text font-bold mb-3">Spieler ({players.length})</h2>
          <div className="flex flex-col gap-2">
            {players.map((p, i) => (
              <div key={p.uid} className="flex items-center justify-between py-2 border-b border-game-border last:border-0"
                style={{
                  animation: newlyJoinedUids.has(p.uid)
                    ? 'joinFlash 1.5s ease both'
                    : `slideInRight 0.3s ${i * 0.07}s ease both`,
                  opacity: newlyJoinedUids.has(p.uid) ? 1 : 0,
                  borderRadius: 8,
                }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: p.color || '#3B82F6' }}>
                    {(p.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-game-text text-sm font-medium truncate">
                    {p.name}
                    {p.uid === meta.host && <span className="ml-1 text-game-blue text-xs">👑</span>}
                    {p.uid === user.uid && <span className="ml-1 text-game-muted text-xs">(du)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Host-transfer button — only for host, only on non-host players */}
                  {isHost && p.uid !== meta.host && (
                    <button
                      onClick={() => handleTransferHost(p.uid)}
                      className="text-game-muted hover:text-yellow-400 transition-colors cursor-pointer text-sm"
                      title="Host-Rolle übertragen"
                    >
                      👑
                    </button>
                  )}

                  {randomRoles ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full border border-game-border text-game-muted">???</span>
                  ) : isHost ? (
                    <select value={p.role || 'hider'} onChange={(e) => setPlayerRole(sessionId, p.uid, e.target.value)}
                      className="bg-game-bg border border-game-border rounded-lg px-2 py-1 text-xs text-game-text focus:outline-none focus:border-game-blue cursor-pointer">
                      <option value="hider">Hider</option>
                      <option value="seeker">Seeker</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${p.role === 'seeker' ? 'border-game-red text-game-red' : 'border-game-green text-game-green'}`}>
                      {p.role === 'seeker' ? 'Seeker' : 'Hider'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* QR code modal */}
      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease both' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: 20, padding: 28, textAlign: 'center', animation: 'scaleIn 0.22s ease both' }}
          >
            <QRCodeSVG value={meta.code} size={200} />
            <p style={{ color: '#0D1117', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.3em', marginTop: 16 }}>{meta.code}</p>
            <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: 6 }}>In der App scannen zum Beitreten</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isHost ? (
          <div className="flex flex-col gap-2">
            {!canStart && (
              <p className="text-game-muted text-xs text-center mb-1">
                {randomRoles ? 'Mind. 2 Spieler erforderlich' : 'Mind. 1 Hider und 1 Seeker erforderlich'}
              </p>
            )}
            <Button onClick={handleStart} disabled={!canStart || starting}
              style={canStart && !starting ? { animation: 'startGlow 1.8s ease-in-out infinite' } : {}}>
              {starting ? 'Spiel wird gestartet...' : 'Spiel starten'}
            </Button>
            <style>{`
              @keyframes startGlow {
                0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
                50%       { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
              }
            `}</style>
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
