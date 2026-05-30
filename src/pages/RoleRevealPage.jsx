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
  const [phase, setPhase] = useState(0);

  const myPlayer = players.find((p) => p.uid === user.uid);
  const isSeeker = myPlayer?.role === 'seeker';
  const color = isSeeker ? '#EF4444' : '#22C55E';
  const label = isSeeker ? 'SEEKER' : 'HIDER';
  const icon = isSeeker ? '🔍' : '🏃';
  const subtitle = isSeeker
    ? 'Finde alle Hider in der Zone!'
    : 'Versteck dich gut — sie kommen!';

  // Phase animation sequence
  useEffect(() => {
    if (loading || !myPlayer?.role) return;
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 780);
    const t3 = setTimeout(() => setPhase(3), 1550);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading, myPlayer?.role]);

  // Countdown
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

  const r = 30;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - countdown / 5);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0D1117',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Radial glow in bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}22 0%, transparent 70%)`,
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 1s ease',
        pointerEvents: 'none',
      }} />

      {/* Expanding pulse rings */}
      {phase >= 2 && [0, 0.9, 1.8].map((delay, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: 260, height: 260,
          marginLeft: -130, marginTop: -130,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          animation: `pulseRing 2.6s ${delay}s ease-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* "du bist" */}
      <p style={{
        color: '#8B949E',
        fontSize: '0.7rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        marginBottom: '2rem',
        opacity: 0,
        animation: phase >= 1 ? 'fadeInUp 0.55s ease both' : 'none',
      }}>
        du bist
      </p>

      {/* Icon */}
      <div style={{
        fontSize: '3.2rem',
        marginBottom: '0.5rem',
        opacity: 0,
        animation: phase >= 3 ? 'trophyBounce 0.55s ease-out both' : 'none',
        lineHeight: 1,
      }}>
        {icon}
      </div>

      {/* Role label — the big stamp */}
      <div style={{
        fontSize: 'clamp(4rem, 20vw, 6rem)',
        fontWeight: 900,
        color,
        lineHeight: 1,
        letterSpacing: '-3px',
        textShadow: `0 0 50px ${color}70`,
        opacity: 0,
        animation: phase >= 2 ? 'stampIn 0.55s ease-out both' : 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {label}
      </div>

      {/* Color accent line */}
      {phase >= 2 && (
        <div style={{
          height: 3, width: 80, borderRadius: 2,
          background: color,
          marginTop: '1rem',
          animation: 'scaleIn 0.3s 0.1s ease both',
          opacity: 0,
        }} />
      )}

      {/* Subtitle */}
      <p style={{
        color: '#8B949E',
        fontSize: '0.95rem',
        marginTop: '1.2rem',
        textAlign: 'center',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        opacity: 0,
        animation: phase >= 3 ? 'fadeInUp 0.5s 0.05s ease both' : 'none',
      }}>
        {subtitle}
      </p>

      {/* SVG countdown ring */}
      <div style={{
        marginTop: '2.5rem',
        opacity: 0,
        animation: phase >= 3 ? 'scaleIn 0.4s 0.15s ease both' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <svg width="76" height="76" viewBox="0 0 76 76">
          {/* Track */}
          <circle cx="38" cy="38" r={r} fill="none" stroke="#30363D" strokeWidth="3" />
          {/* Progress arc */}
          <circle
            cx="38" cy="38" r={r}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '38px 38px',
              transition: 'stroke-dashoffset 0.88s ease',
            }}
          />
          <text
            x="38" y="38"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="22"
            fontWeight="900"
            fontFamily="Inter,system-ui,sans-serif"
          >
            {countdown}
          </text>
        </svg>
        <p style={{
          color: '#8B949E',
          fontSize: '0.65rem',
          marginTop: '0.35rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Sekunden
        </p>
      </div>
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
