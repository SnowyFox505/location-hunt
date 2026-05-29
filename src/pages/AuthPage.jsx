import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, mapError } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (tab === 'register') {
      if (!displayName.trim()) return setError('Bitte gib einen Anzeigenamen ein.');
      if (password !== password2) return setError('Passwörter stimmen nicht überein.');
      if (password.length < 6) return setError('Passwort muss mindestens 6 Zeichen lang sein.');
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(displayName, email, password);
      }
      navigate('/home');
    } catch (err) {
      setError(mapError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-safe flex items-center justify-center min-h-full bg-game-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-game-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-black">L</span>
          </div>
          <h1 className="text-game-text text-3xl font-black">LocationHunt</h1>
          <p className="text-game-muted text-sm mt-1">GPS Hide & Seek</p>
        </div>

        <Card>
          <div className="flex mb-6 bg-game-bg rounded-xl p-1">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  tab === t ? 'bg-game-blue text-white' : 'text-game-muted hover:text-game-text'
                }`}
              >
                {t === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'register' && (
              <Input
                label="Anzeigename"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Max"
                autoComplete="nickname"
              />
            )}
            <Input
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@beispiel.de"
              autoComplete="email"
            />
            <Input
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            {tab === 'register' && (
              <Input
                label="Passwort wiederholen"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}

            {error && (
              <div className="bg-red-900/30 border border-game-red rounded-lg px-4 py-3 text-game-red text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Laden...' : tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
