import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';

const GLASS = {
  background: 'rgba(22,27,34,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(48,54,61,0.8)',
  borderRadius: 16,
  padding: '24px',
};

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
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: 'url(/bg-home.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(13,17,23,0.45) 0%, rgba(13,17,23,0.72) 50%, rgba(13,17,23,0.92) 100%)',
        pointerEvents: 'none',
      }} />

      <div
        className="pt-safe relative flex flex-col h-full px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto"
        style={{ zIndex: 1 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/home')}
            style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 1 }}
            className="cursor-pointer"
          >
            ←
          </button>
          <h1 className="text-white font-bold text-xl" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            Spiel beitreten
          </h1>
        </div>

        <div style={GLASS}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', fontWeight: 500 }}>
                Session-Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XK92PL"
                autoComplete="off"
                style={{
                  background: 'rgba(13,17,23,0.6)',
                  border: '1px solid rgba(48,54,61,0.8)',
                  borderRadius: 12,
                  padding: '16px',
                  color: 'white',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  outline: 'none',
                  width: '100%',
                  minHeight: 64,
                  caretColor: '#3B82F6',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.8)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(48,54,61,0.8)')}
              />
            </div>

            {error && (
              <div
                key={error}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  animation: 'shake 0.42s ease both',
                }}
              >
                {error}
              </div>
            )}

            <Button onClick={handleJoin} disabled={loading || !code.trim()}>
              {loading ? 'Wird beigetreten...' : 'Beitreten'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
