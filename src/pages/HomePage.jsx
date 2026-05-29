import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/UI/Button';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.displayName || user?.email?.split('@')[0] || 'Spieler';

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-game-blue rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-black">L</span>
          </div>
          <span className="text-game-text font-bold text-lg">LocationHunt</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-game-muted text-sm hover:text-game-text transition-colors cursor-pointer"
        >
          Abmelden
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h1 className="text-game-text text-3xl font-black">
            Hallo, <span className="text-game-blue">{name}</span>!
          </h1>
          <p className="text-game-muted mt-2">Was möchtest du machen?</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/create')}
            className="bg-game-card border border-game-border rounded-2xl p-6 text-left hover:border-game-blue transition-colors cursor-pointer active:scale-95"
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
