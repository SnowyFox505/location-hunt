import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';

export default function JoinPage() {
  const { code: urlCode } = useParams();
  const [tab, setTab] = useState(urlCode ? 'link' : 'code');
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { joinSession } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (urlCode) {
      setCode(urlCode);
      setTab('link');
    }
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
        <div className="flex mb-6 bg-game-bg rounded-xl p-1">
          {['code', 'link'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                tab === t ? 'bg-game-blue text-white' : 'text-game-muted hover:text-game-text'
              }`}
            >
              {t === 'code' ? 'Per Code' : 'Per Link'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {tab === 'code' ? (
            <Input
              label="Session-Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XK92PL"
              autoComplete="off"
              className="tracking-[0.3em] text-center text-xl font-bold"
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-game-muted text-sm font-medium">Code aus Link</label>
              <div className="bg-game-bg border border-game-border rounded-lg px-4 py-3 text-game-text font-bold tracking-[0.3em] text-center text-xl">
                {code || '—'}
              </div>
            </div>
          )}

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
