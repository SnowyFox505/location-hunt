import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGame, GameProvider } from '../contexts/GameContext';
import { useSession } from '../hooks/useSession';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const SEEKER_COLORS = ['#EF4444', '#F97316', '#FCD34D', '#ffffff', '#fb7185', '#fbbf24', '#ef4444', '#f97316'];
const HIDER_COLORS  = ['#22C55E', '#06B6D4', '#86efac', '#ffffff', '#34d399', '#a7f3d0', '#22c55e', '#10b981'];

function EndContent() {
  const { sessionId } = useParams();
  const { meta, players, game, stats, loading } = useGame();
  const { resetSession } = useSession();
  const { user } = useAuth();
  const navigate = useNavigate();

  const seekersWon = stats?.winner === 'seeker';
  const winColor = seekersWon ? '#EF4444' : '#22C55E';

  // Pre-generate particles once per render
  const particles = useMemo(() => {
    const colors = seekersWon ? SEEKER_COLORS : HIDER_COLORS;
    return Array.from({ length: 34 }, (_, i) => {
      const angle = (i / 34) * 360 + (Math.random() * 18 - 9);
      const rad = (angle * Math.PI) / 180;
      const dist = 90 + Math.random() * 210;
      return {
        tx: Math.cos(rad) * dist,
        ty: Math.sin(rad) * dist - 40,
        r: Math.random() * 720 - 360,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 10,
        circle: Math.random() > 0.38,
        duration: 0.75 + Math.random() * 0.7,
        delay: Math.random() * 0.35,
      };
    });
  }, [seekersWon]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const duration = stats.endedAt && game?.startedAt
    ? Math.floor((stats.endedAt - game.startedAt) / 1000 / 60)
    : null;

  const caughtPlayers = players
    .filter((p) => p.role === 'hider' && p.caught)
    .sort((a, b) => (a.caughtAt || 0) - (b.caughtAt || 0));

  async function handleNewRound() {
    await resetSession(sessionId);
    navigate(`/lobby/${sessionId}`);
  }

  return (
    <>
      {/* Full-screen flash overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: winColor,
        animation: 'winFlash 1.3s ease-out both',
        pointerEvents: 'none',
        zIndex: 200,
      }} />

      {/* Confetti particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 199, overflow: 'hidden' }}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '24%',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.circle ? '50%' : '3px',
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--pr': `${p.r}deg`,
              animation: `particleBurst ${p.duration}s ${p.delay}s ease-out both`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Scrollable content */}
      <div className="pt-safe flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto">

        {/* Winner hero section */}
        <div style={{
          background: `linear-gradient(160deg, #161B22 0%, #0D1117 100%)`,
          border: `1.5px solid ${winColor}35`,
          borderRadius: 24,
          padding: '2rem 1.5rem 1.8rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '1.25rem',
        }}>
          {/* Top gradient accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent 0%, ${winColor} 40%, ${winColor} 60%, transparent 100%)`,
          }} />

          {/* Glow blob behind emoji */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%',
            transform: 'translateX(-50%)',
            width: 180, height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${winColor}30 0%, transparent 70%)`,
            animation: 'fadeIn 0.6s 0.5s ease both',
            opacity: 0,
            pointerEvents: 'none',
          }} />

          {/* Trophy emoji */}
          <div style={{
            fontSize: '5rem',
            lineHeight: 1,
            marginBottom: '0.75rem',
            animation: 'trophyBounce 0.55s 0.35s ease-out both',
            opacity: 0,
            position: 'relative',
          }}>
            {seekersWon ? '🎯' : '🏃'}
          </div>

          {/* Winner title */}
          <h1 style={{
            fontSize: 'clamp(1.7rem, 7vw, 2.2rem)',
            fontWeight: 900,
            color: winColor,
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            textShadow: `0 0 40px ${winColor}55`,
            animation: 'stampIn 0.45s 0.55s ease-out both',
            opacity: 0,
          }}>
            {seekersWon ? 'SEEKER GEWINNEN!' : 'HIDER GEWINNEN!'}
          </h1>

          {/* Stats line */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '1.5rem',
            marginTop: '1rem',
            animation: 'fadeInUp 0.4s 1s ease both',
            opacity: 0,
          }}>
            {duration != null && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#E6EDF3', fontWeight: 700, fontSize: '1.1rem' }}>{duration}</p>
                <p style={{ color: '#8B949E', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Minuten</p>
              </div>
            )}
            {game?.pingCount != null && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#E6EDF3', fontWeight: 700, fontSize: '1.1rem' }}>{game.pingCount}</p>
                <p style={{ color: '#8B949E', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pings</p>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#E6EDF3', fontWeight: 700, fontSize: '1.1rem' }}>{players.length}</p>
              <p style={{ color: '#8B949E', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spieler</p>
            </div>
          </div>
        </div>

        {/* Results table */}
        <Card style={{ animation: 'fadeInUp 0.4s 1.1s ease both', opacity: 0 }}>
          <h2 className="text-game-text font-bold mb-3">Ergebnisse</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-game-muted text-xs border-b border-game-border">
                  <th className="text-left pb-2">Spieler</th>
                  <th className="text-left pb-2">Rolle</th>
                  <th className="text-left pb-2">Status</th>
                  <th className="text-left pb-2">Zeit</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.uid}
                    className="border-b border-game-border/50 last:border-0"
                    style={{ animation: `fadeInUp 0.3s ${1.2 + i * 0.07}s ease both`, opacity: 0 }}
                  >
                    <td className="py-2 text-game-text font-medium">{p.name}</td>
                    <td className="py-2">
                      <span className={`text-xs font-semibold ${p.role === 'seeker' ? 'text-game-red' : 'text-game-green'}`}>
                        {p.role === 'seeker' ? 'Seeker' : 'Hider'}
                      </span>
                    </td>
                    <td className="py-2">
                      {p.role === 'hider' ? (
                        <span className={`text-xs ${p.caught ? 'text-game-red' : 'text-game-green'}`}>
                          {p.caught ? 'Gefangen' : 'Entkommen'}
                        </span>
                      ) : (
                        <span className="text-game-blue text-xs">Aktiv</span>
                      )}
                    </td>
                    <td className="py-2 text-game-muted text-xs">
                      {p.caughtAt ? format(new Date(p.caughtAt), 'HH:mm', { locale: de }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Catch order */}
        {caughtPlayers.length > 0 && (
          <Card style={{ animation: `fadeInUp 0.4s ${1.3 + players.length * 0.07}s ease both`, opacity: 0 }}>
            <h2 className="text-game-text font-bold mb-3">Fang-Reihenfolge</h2>
            <div className="flex flex-col gap-2">
              {caughtPlayers.map((p, i) => (
                <div
                  key={p.uid}
                  className="flex items-center gap-3"
                  style={{ animation: `slideInRight 0.3s ${1.4 + players.length * 0.07 + i * 0.09}s ease both`, opacity: 0 }}
                >
                  <span style={{
                    width: 26, height: 26,
                    borderRadius: '50%',
                    background: i === 0 ? '#F97316' : '#30363D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span className="text-game-text text-sm">{p.name}</span>
                  {i === 0 && <span className="text-game-orange text-xs font-semibold ml-auto">zuerst</span>}
                  {i === caughtPlayers.length - 1 && caughtPlayers.length > 1 && (
                    <span className="text-game-muted text-xs ml-auto">zuletzt</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div
          className="flex flex-col gap-3 mt-2"
          style={{ animation: 'fadeInUp 0.4s 1.8s ease both', opacity: 0 }}
        >
          <Button onClick={handleNewRound}>Neue Runde</Button>
          <Button variant="ghost" onClick={async () => {
            if (meta?.host === user?.uid) {
              await set(ref(db, `sessions/${sessionId}/meta/status`), 'closed');
            }
            navigate('/home');
          }}>
            Beenden
          </Button>
        </div>
      </div>
    </>
  );
}

export default function EndPage() {
  const { sessionId } = useParams();
  return (
    <GameProvider sessionId={sessionId}>
      <EndContent />
    </GameProvider>
  );
}
