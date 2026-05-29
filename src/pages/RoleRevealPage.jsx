import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';

function RoleRevealContent() {
  const { sessionId } = useParams();
  const { players, loading } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';

  useEffect(() => {
    if (loading || !myPlayer?.role) return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate(`/game/${sessionId}/hiding`, { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, myPlayer?.role]);

  if (loading || !myPlayer?.role) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const color = isSeeker ? '#EF4444' : '#22C55E';
  const label = isSeeker ? 'SEEKER' : 'HIDER';
  const subtitle = isSeeker
    ? 'Finde alle Hider in der Zone!'
    : 'Versteck dich gut — sie kommen!'

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-game-bg"
      style={{ userSelect: 'none' }}
    >
      <p className="text-game-muted text-sm uppercase tracking-widest mb-6">Du bist</p>

      <div
        style={{
          fontSize: '80px',
          fontWeight: 900,
          color,
          lineHeight: 1,
          letterSpacing: '-2px',
          textShadow: `0 0 60px ${color}60`,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        {label}
      </div>

      <p className="text-game-muted text-base mt-6 text-center px-8">{subtitle}</p>

      <div
        className="mt-12 flex items-center justify-center rounded-full border-4"
        style={{
          width: 64,
          height: 64,
          borderColor: color,
          color,
          fontSize: 28,
          fontWeight: 900,
        }}
      >
        {countdown}
      </div>
      <p className="text-game-muted text-xs mt-2">Sekunden</p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

export default function RoleRevealPage() {
  const { sessionId } = useParams();
  return (
    <GameProvider sessionId={sessionId}>
      <RoleRevealContent />
    </GameProvider>
  );
}
