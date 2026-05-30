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
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: 'url(/bg-home.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* Dark gradient overlay so text stays readable */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(13,17,23,0.45) 0%, rgba(13,17,23,0.72) 50%, rgba(13,17,23,0.92) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div
        className="pt-safe relative flex flex-col h-full px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              className="w-10 h-10 rounded-xl object-cover"
              alt="LocationHunt"
              style={{ animation: 'float 4s ease-in-out infinite' }}
            />
            <span className="text-white font-bold text-lg" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
              LocationHunt
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="cursor-pointer" style={{ flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `2px solid ${color}`,
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(22,27,34,0.8)',
                backdropFilter: 'blur(8px)',
              }}>
                {profile?.photoBase64
                  ? <img src={profile.photoBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{initials}</span>
                }
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="text-sm cursor-pointer transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              Abmelden
            </button>
          </div>
        </div>

        {/* Greeting + cards */}
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div style={{ animation: 'fadeInUp 0.5s 0.05s ease both', opacity: 0 }}>
            <h1 className="text-white text-3xl font-black" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
              Hallo, <span style={{ color }}>{name}</span>!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: '0.5rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              Was möchtest du machen?
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/create')}
              className="rounded-2xl p-6 text-left cursor-pointer active:scale-95 transition-all"
              style={{
                animation: 'fadeInUp 0.5s 0.15s ease both',
                opacity: 0,
                background: 'rgba(22,27,34,0.72)',
                border: '1px solid rgba(48,54,61,0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(48,54,61,0.8)'}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(59,130,246,0.2)' }}>
                <span className="text-game-blue text-2xl">＋</span>
              </div>
              <h2 className="text-white text-xl font-bold">Spiel erstellen</h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Zone festlegen und Session starten
              </p>
            </button>

            <button
              onClick={() => navigate('/join')}
              className="rounded-2xl p-6 text-left cursor-pointer active:scale-95 transition-all"
              style={{
                animation: 'fadeInUp 0.5s 0.28s ease both',
                opacity: 0,
                background: 'rgba(22,27,34,0.72)',
                border: '1px solid rgba(48,54,61,0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(48,54,61,0.8)'}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(34,197,94,0.2)' }}>
                <span className="text-game-green text-2xl">→</span>
              </div>
              <h2 className="text-white text-xl font-bold">Spiel beitreten</h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Mit Code oder Link einer Session beitreten
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
