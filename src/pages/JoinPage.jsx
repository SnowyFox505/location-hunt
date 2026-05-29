import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

export default function JoinPage() {
  const { code: urlCode } = useParams();
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { joinSession } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (urlCode) setCode(urlCode.toUpperCase());
  }, [urlCode]);

  async function handleJoin() {
    if (!code.trim()) return setError('Bitte gib einen Code ein.');
    setLoading(true);
    setError('');
    try {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Spieler';
      const sessionId = await joinSession(code.trim(), user.uid, displayName);
      navigate(`/lobby/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Fehler beim Beitreten.');
      setLoading(false);
    }
  }

  return (
    <div className="pt-safe flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/home')} className="text-game-muted hover:text-game-text cursor-pointer text-xl">←</button>
        <h1 className="text-game-text font-bold text-xl">Spiel beitreten</h1>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-game-muted text-sm font-medium">Session-Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XK92PL"
              autoComplete="off"
              className="bg-game-bg border border-game-border rounded-lg px-4 py-3 text-game-text tracking-[0.3em] text-center text-2xl font-bold placeholder-game-muted focus:outline-none focus:border-game-blue min-h-[64px]"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-game-red rounded-lg px-4 py-3 text-game-red text-sm">
              {error}
            </div>
          )}

          <Button onClick={handleJoin} disabled={loading || !code.trim()}>
            {loading ? 'Wird beigetreten...' : 'Beitreten'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
