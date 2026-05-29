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

function EndContent() {
  const { sessionId } = useParams();
  const { meta, players, game, stats, loading } = useGame();
  const { resetSession } = useSession();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading || !stats) {
    return <div className="flex items-center justify-center h-full bg-game-bg"><div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const seekersWon = stats.winner === 'seeker';
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
    <div className="flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto">
      <div className="text-center py-8">
        <div className={`text-6xl mb-4`}>{seekersWon ? '🎯' : '🏃'}</div>
        <h1 className={`text-3xl font-black ${seekersWon ? 'text-game-red' : 'text-game-green'}`}>
          {seekersWon ? 'Seeker gewinnen!' : 'Hider gewinnen!'}
        </h1>
        {duration != null && (
          <p className="text-game-muted text-sm mt-2">Spielzeit: {duration} Minuten</p>
        )}
        {game?.pingCount != null && (
          <p className="text-game-muted text-xs">{game.pingCount} Pings gesendet</p>
        )}
      </div>

      <Card className="mb-4">
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
              {players.map((p) => (
                <tr key={p.uid} className="border-b border-game-border/50 last:border-0">
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

      {caughtPlayers.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-game-text font-bold mb-3">Fang-Reihenfolge</h2>
          <div className="flex flex-col gap-1">
            {caughtPlayers.map((p, i) => (
              <div key={p.uid} className="flex items-center gap-2 text-sm">
                <span className="text-game-muted w-5">#{i + 1}</span>
                <span className="text-game-text">{p.name}</span>
                {i === 0 && <span className="text-game-orange text-xs">zuerst</span>}
                {i === caughtPlayers.length - 1 && caughtPlayers.length > 1 && (
                  <span className="text-game-muted text-xs">zuletzt</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={handleNewRound}>Neue Runde</Button>
        <Button variant="ghost" onClick={async () => {
          if (meta?.host === user?.uid) {
            await set(ref(db, `sessions/${sessionId}/meta/status`), 'closed');
          }
          navigate('/home');
        }}>Beenden</Button>
      </div>
    </div>
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
