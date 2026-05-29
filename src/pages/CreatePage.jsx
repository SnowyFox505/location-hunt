import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import ZoneDrawer from '../components/Map/ZoneDrawer';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const GAME_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const HIDING_DURATION_OPTIONS = [1, 2, 3, 5, 10];

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState({
    gameDuration: 20,
    hidingDuration: 3,
    pingInterval: 3,
    catchRadius: 15,
  });
  const [polygon, setPolygon] = useState(null);
  const [gpsCenter, setGpsCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { createSession } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGpsCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setGpsCenter([51.505, -0.09])
    );
  }, []);

  async function handleCreate() {
    if (!polygon || polygon.length < 3) {
      setError('Bitte zeichne eine Spielzone mit mindestens 3 Punkten.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { sessionId } = await createSession(user.uid, user.displayName || user.email, settings, polygon);
      navigate(`/lobby/${sessionId}`);
    } catch (e) {
      setError('Fehler beim Erstellen der Session. Bitte versuche es erneut.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-game-bg max-w-sm mx-auto w-full">
      <div className="px-4 py-6 flex items-center gap-3 border-b border-game-border shrink-0">
        <button onClick={() => step === 2 ? setStep(1) : navigate('/home')} className="text-game-muted hover:text-game-text cursor-pointer">
          ←
        </button>
        <h1 className="text-game-text font-bold text-lg">
          {step === 1 ? 'Einstellungen' : 'Zone zeichnen'}
        </h1>
        <div className="ml-auto flex gap-1">
          {[1, 2].map((s) => (
            <div key={s} className={`w-2 h-2 rounded-full ${step >= s ? 'bg-game-blue' : 'bg-game-border'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
          <Card>
            <h2 className="text-game-text font-bold mb-4">Spielzeit</h2>
            <div className="flex flex-wrap gap-2">
              {GAME_DURATION_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setSettings((s) => ({ ...s, gameDuration: v }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                    settings.gameDuration === v
                      ? 'bg-game-blue border-game-blue text-white'
                      : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'
                  }`}
                >
                  {v} Min
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-game-text font-bold mb-4">Versteckzeit</h2>
            <div className="flex flex-wrap gap-2">
              {HIDING_DURATION_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setSettings((s) => ({ ...s, hidingDuration: v }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                    settings.hidingDuration === v
                      ? 'bg-game-blue border-game-blue text-white'
                      : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'
                  }`}
                >
                  {v} Min
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-game-text font-bold mb-4">Ping-Intervall</h2>
            <select
              value={settings.pingInterval}
              onChange={(e) => setSettings((s) => ({ ...s, pingInterval: Number(e.target.value) }))}
              className="w-full bg-game-bg border border-game-border rounded-lg px-4 py-3 text-game-text focus:outline-none focus:border-game-blue min-h-[48px]"
            >
              {[2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} Minuten</option>
              ))}
            </select>
            <p className="text-game-muted text-xs mt-2">Alle X Minuten erhalten Seeker einen Ping mit Hider-Positionen.</p>
          </Card>

          <Card>
            <h2 className="text-game-text font-bold mb-1">Fang-Radius: {settings.catchRadius} m</h2>
            <p className="text-game-muted text-xs mb-4">Wie nah muss ein Seeker an einen Hider?</p>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.catchRadius}
              onChange={(e) => setSettings((s) => ({ ...s, catchRadius: Number(e.target.value) }))}
              className="w-full accent-game-blue"
            />
            <div className="flex justify-between text-game-muted text-xs mt-1">
              <span>5 m</span><span>30 m</span>
            </div>
          </Card>

          <Button onClick={() => setStep(2)}>Weiter: Zone zeichnen →</Button>
        </div>
      )}

      {step === 2 && (
        <div className="fixed inset-0 flex flex-col bg-game-bg z-50">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-game-border shrink-0 bg-game-bg">
            <button onClick={() => setStep(1)} className="text-game-muted hover:text-game-text cursor-pointer text-xl">←</button>
            <h1 className="text-game-text font-bold text-lg">Zone zeichnen</h1>
          </div>

          <div className="px-4 py-3 bg-game-card border-b border-game-border shrink-0">
            <p className="text-game-muted text-sm">
              Tippe auf die Karte um Punkte zu setzen. Doppeltippe zum Abschließen.
            </p>
            {polygon && polygon.length >= 3 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-game-green text-sm font-semibold">✓ Zone gezeichnet ({polygon.length} Punkte)</span>
                <button onClick={() => setPolygon(null)} className="text-game-red text-sm cursor-pointer">Zone löschen</button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {gpsCenter ? (
              <ZoneDrawer
                center={gpsCenter}
                polygon={polygon}
                onPolygonDrawn={setPolygon}
                gpsPosition={gpsCenter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-game-muted">GPS wird geladen...</div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-900/30 border-t border-game-red text-game-red text-sm shrink-0">
              {error}
            </div>
          )}

          <div className="px-4 py-4 shrink-0 bg-game-bg border-t border-game-border">
            <Button onClick={handleCreate} disabled={!polygon || polygon.length < 3 || loading}>
              {loading ? 'Session wird erstellt...' : 'Session erstellen'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
