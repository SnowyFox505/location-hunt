import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import { useZones } from '../hooks/useZones';
import ZoneDrawer from '../components/Map/ZoneDrawer';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';

const GAME_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const HIDING_DURATION_OPTIONS = [1, 2, 3, 5, 10];

function ZoneLibrary({ uid, currentPolygon, onLoad, onClose }) {
  const { zones, loading, saveZone, deleteZone, generateShareCode, importByCode } = useZones(uid);
  const [tab, setTab] = useState('my');
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(null);

  async function handleSave() {
    if (!saveName.trim()) return;
    if (!currentPolygon || currentPolygon.length < 3) return;
    setSaving(true);
    await saveZone(saveName, currentPolygon);
    setSaveName('');
    setSaving(false);
  }

  async function handleShare(zoneId) {
    setGeneratingCode(zoneId);
    try {
      const code = await generateShareCode(zoneId);
      await navigator.clipboard.writeText(code).catch(() => {});
      setCopiedCode(zoneId);
      setTimeout(() => setCopiedCode(null), 3000);
    } finally {
      setGeneratingCode(null);
    }
  }

  async function handleImport() {
    if (!importCode.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const zone = await importByCode(importCode);
      onLoad(zone.polygon, zone.name);
      onClose();
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
        backgroundColor: '#161B22', borderTop: '1px solid #30363D',
        borderRadius: '20px 20px 0 0', maxHeight: '75vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#30363D' }} />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-game-text font-bold text-lg">Zonen-Bibliothek</h2>
          <button onClick={onClose} className="text-game-muted hover:text-game-text cursor-pointer text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mb-3 bg-game-bg rounded-xl p-1">
          {[['my', 'Meine Zonen'], ['import', 'Importieren']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                tab === key ? 'bg-game-blue text-white' : 'text-game-muted hover:text-game-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {tab === 'my' && (
            <div className="flex flex-col gap-3">
              {/* Save current zone */}
              {currentPolygon && currentPolygon.length >= 3 && (
                <div className="bg-game-bg rounded-xl p-3 border border-game-border">
                  <p className="text-game-muted text-xs mb-2">Aktuelle Zone speichern</p>
                  <div className="flex gap-2">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Name der Zone..."
                      className="flex-1 bg-game-card border border-game-border rounded-lg px-3 py-2 text-game-text text-sm placeholder-game-muted focus:outline-none focus:border-game-blue"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                      onClick={handleSave}
                      disabled={!saveName.trim() || saving}
                      className="px-4 py-2 bg-game-blue rounded-lg text-white text-sm font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {saving ? '...' : 'Speichern'}
                    </button>
                  </div>
                </div>
              )}

              {loading && <p className="text-game-muted text-sm text-center py-4">Laden...</p>}
              {!loading && zones.length === 0 && (
                <p className="text-game-muted text-sm text-center py-6">Noch keine gespeicherten Zonen.</p>
              )}

              {zones.map((zone) => (
                <div key={zone.id} className="bg-game-bg rounded-xl p-3 border border-game-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-game-text font-semibold text-sm">{zone.name}</p>
                    <p className="text-game-muted text-xs">{zone.polygon?.length} Punkte</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onLoad(zone.polygon, zone.name); onClose(); }}
                      className="flex-1 py-1.5 bg-game-blue rounded-lg text-white text-xs font-semibold cursor-pointer"
                    >
                      Laden
                    </button>
                    <button
                      onClick={() => handleShare(zone.id)}
                      disabled={generatingCode === zone.id}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        copiedCode === zone.id
                          ? 'bg-game-green/20 border-game-green text-game-green'
                          : 'border-game-border text-game-muted hover:border-game-blue'
                      }`}
                    >
                      {copiedCode === zone.id
                        ? `Code: ${zone.shareCode}`
                        : generatingCode === zone.id
                          ? '...'
                          : zone.shareCode
                            ? 'Code kopieren'
                            : 'Teilen'}
                    </button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="px-3 py-1.5 rounded-lg text-game-red border border-game-border hover:border-game-red text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  {zone.shareCode && copiedCode !== zone.id && (
                    <p className="text-game-muted text-xs mt-1.5">Code: <span className="text-game-blue font-mono">{zone.shareCode}</span></p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'import' && (
            <div className="flex flex-col gap-3">
              <p className="text-game-muted text-sm">
                Gib den 6-stelligen Code ein, den dir jemand geteilt hat.
              </p>
              <input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="z.B. XK92PL"
                className="bg-game-card border border-game-border rounded-lg px-4 py-3 text-game-text text-center font-bold tracking-[0.3em] text-xl placeholder-game-muted focus:outline-none focus:border-game-blue"
              />
              {importError && (
                <p className="text-game-red text-sm">{importError}</p>
              )}
              <Button onClick={handleImport} disabled={importCode.length < 6 || importing}>
                {importing ? 'Wird geladen...' : 'Zone importieren'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
  const [showLibrary, setShowLibrary] = useState(false);
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
                <button key={v} onClick={() => setSettings((s) => ({ ...s, gameDuration: v }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${settings.gameDuration === v ? 'bg-game-blue border-game-blue text-white' : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'}`}>
                  {v} Min
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-game-text font-bold mb-4">Versteckzeit</h2>
            <div className="flex flex-wrap gap-2">
              {HIDING_DURATION_OPTIONS.map((v) => (
                <button key={v} onClick={() => setSettings((s) => ({ ...s, hidingDuration: v }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${settings.hidingDuration === v ? 'bg-game-blue border-game-blue text-white' : 'bg-game-bg border-game-border text-game-muted hover:border-game-blue'}`}>
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
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} Minute{v > 1 ? 'n' : ''}</option>
              ))}
            </select>
            <p className="text-game-muted text-xs mt-2">Alle X Minuten erhalten Seeker einen Ping mit Hider-Positionen.</p>
          </Card>

          <Card>
            <h2 className="text-game-text font-bold mb-1">Fang-Radius: {settings.catchRadius} m</h2>
            <p className="text-game-muted text-xs mb-4">Wie nah muss ein Seeker an einen Hider?</p>
            <input type="range" min={5} max={30} step={5} value={settings.catchRadius}
              onChange={(e) => setSettings((s) => ({ ...s, catchRadius: Number(e.target.value) }))}
              className="w-full accent-game-blue" />
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
                <button onClick={() => setPolygon(null)} className="text-game-red text-sm cursor-pointer">Löschen</button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0">
            {gpsCenter ? (
              <ZoneDrawer center={gpsCenter} polygon={polygon} onPolygonDrawn={setPolygon} gpsPosition={gpsCenter} />
            ) : (
              <div className="flex items-center justify-center h-full text-game-muted">GPS wird geladen...</div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-900/30 border-t border-game-red text-game-red text-sm shrink-0">
              {error}
            </div>
          )}

          <div className="px-4 py-4 shrink-0 bg-game-bg border-t border-game-border flex gap-3">
            <button
              onClick={() => setShowLibrary(true)}
              className="flex-none px-4 py-3 rounded-xl border border-game-border text-game-muted hover:border-game-blue hover:text-game-blue text-sm font-semibold cursor-pointer transition-colors"
            >
              📁 Bibliothek
            </button>
            <Button onClick={handleCreate} disabled={!polygon || polygon.length < 3 || loading} className="flex-1">
              {loading ? 'Wird erstellt...' : 'Session erstellen'}
            </Button>
          </div>
        </div>
      )}

      {showLibrary && (
        <ZoneLibrary
          uid={user.uid}
          currentPolygon={polygon}
          onLoad={(poly) => setPolygon(poly)}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
