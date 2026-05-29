import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

function LobbyContent() {
  const { sessionId } = useParams();
  const { meta, players, loading } = useGame();
  const { user } = useAuth();
  const { startGame, setPlayerRole } = useSession();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!loading && meta?.status === 'hiding') navigate(`/game/${sessionId}/hiding`, { replace: true });
    if (!loading && meta?.status === 'playing') navigate(`/game/${sessionId}/play`, { replace: true });
    if (!loading && meta?.status === 'ended') navigate(`/game/${sessionId}/end`, { replace: true });
  }, [meta?.status, loading]);

  if (loading || !meta) {
    return <div className="flex items-center justify-center h-full bg-game-bg"><div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const isHost = meta.host === user.uid;
  const inviteLink = `${window.location.origin}/join/${meta.code}`;
  const hiders = players.filter((p) => p.role === 'hider');
  const seekers = players.filter((p) => p.role === 'seeker');
  const canStart = hiders.length >= 1 && seekers.length >= 1;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStart() {
    setStarting(true);
    try {
      await startGame(sessionId, meta.settings);
      navigate(`/game/${sessionId}/hiding`);
    } catch {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/home')} className="text-game-muted hover:text-game-text cursor-pointer text-xl">←</button>
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
          <div className="flex justify-between text-game-muted text-xs mb-1">
            <span>⏱ {meta.settings?.gameDuration} Min</span>
            <span>📡 Ping alle {meta.settings?.pingInterval} Min</span>
            <span>🎯 {meta.settings?.catchRadius} m Radius</span>
          </div>
        </Card>

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

                {isHost ? (
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
          <div>
            {!canStart && (
              <p className="text-game-muted text-xs text-center mb-2">Mindestens 1 Hider und 1 Seeker erforderlich</p>
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
