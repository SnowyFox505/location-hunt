import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, DEFAULT_COLOR } from '../hooks/useUserProfile';

export default function HomePage() {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile(user?.uid);
  const navigate = useNavigate();
  const name = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Spieler';
  const color = profile?.color || DEFAULT_COLOR;
  const initials = (name || '?').slice(0, 2).toUpperCase();

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="pt-safe flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center justify-between mb-8" style={{ animation: 'fadeIn 0.4s ease both' }}>
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            className="w-10 h-10 rounded-xl object-cover"
            alt="LocationHunt"
            style={{ animation: 'float 4s ease-in-out infinite' }}
          />
          <span className="text-game-text font-bold text-lg">LocationHunt</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="cursor-pointer"
            style={{ flexShrink: 0 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `2px solid ${color}`,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#161B22',
              }}
            >
              {profile?.photoBase64
                ? <img src={profile.photoBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{initials}</span>
              }
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="text-game-muted text-sm hover:text-game-text transition-colors cursor-pointer"
          >
            Abmelden
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        <div style={{ animation: 'fadeInUp 0.5s 0.05s ease both', opacity: 0 }}>
          <h1 className="text-game-text text-3xl font-black">
            Hallo, <span style={{ color }}>{name}</span>!
          </h1>
          <p className="text-game-muted mt-2">Was möchtest du machen?</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/create')}
            className="bg-game-card border border-game-border rounded-2xl p-6 text-left hover:border-game-blue transition-colors cursor-pointer active:scale-95"
            style={{ animation: 'fadeInUp 0.5s 0.15s ease both', opacity: 0 }}
          >
            <div className="w-12 h-12 bg-game-blue/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-game-blue text-2xl">＋</span>
            </div>
            <h2 className="text-game-text text-xl font-bold">Spiel erstellen</h2>
            <p className="text-game-muted text-sm mt-1">Zone festlegen und Session starten</p>
          </button>

          <button
            onClick={() => navigate('/join')}
            className="bg-game-card border border-game-border rounded-2xl p-6 text-left hover:border-game-blue transition-colors cursor-pointer active:scale-95"
            style={{ animation: 'fadeInUp 0.5s 0.28s ease both', opacity: 0 }}
          >
            <div className="w-12 h-12 bg-game-green/20 rounded-xl flex items-center justify-center mb-3">
              <span className="text-game-green text-2xl">→</span>
            </div>
            <h2 className="text-game-text text-xl font-bold">Spiel beitreten</h2>
            <p className="text-game-muted text-sm mt-1">Mit Code oder Link einer Session beitreten</p>
          </button>
        </div>
      </div>
    </div>
  );
}
