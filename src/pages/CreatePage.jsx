import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import { useZones } from '../hooks/useZones';
import ZoneDrawer from '../components/Map/ZoneDrawer';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';

const GAME_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const HIDING_DURATION_OPTIONS = [1, 2, 3, 5, 10];

const GLASS_CARD = {
  background: 'rgba(22,27,34,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(48,54,61,0.8)',
  borderRadius: 16,
  padding: '20px',
};

function optionBtn(active) {
  return {
    padding: '8px 16px',
    borderRadius: 12,
    fontSize: '0.875rem',
    fontWeight: 600,
    border: active ? '1px solid #3B82F6' : '1px solid rgba(48,54,61,0.8)',
    background: active ? '#3B82F6' : 'rgba(13,17,23,0.45)',
    color: active ? 'white' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

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
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, animation: 'fadeIn 0.2s ease both' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
        backgroundColor: '#161B22', borderTop: '1px solid #30363D',
        borderRadius: '20px 20px 0 0', maxHeight: '75vh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInUp 0.3s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#30363D' }} />
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-game-text font-bold text-lg">Zonen-Bibliothek</h2>
          <button onClick={onClose} className="text-game-muted hover:text-game-text cursor-pointer text-xl">✕</button>
        </div>
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
              {zones.map((zone, i) => (
                <div key={zone.id} className="bg-game-bg rounded-xl p-3 border border-game-border"
                  style={{ animation: `fadeInUp 0.3s ${i * 0.06}s ease both`, opacity: 0 }}>
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
                      {copiedCode === zone.id ? `Code: ${zone.shareCode}` : generatingCode === zone.id ? '...' : zone.shareCode ? 'Code kopieren' : 'Teilen'}
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
              <p className="text-game-muted text-sm">Gib den 6-stelligen Code ein, den dir jemand geteilt hat.</p>
              <input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="z.B. XK92PL"
                className="bg-game-card border border-game-border rounded-lg px-4 py-3 text-game-text text-center font-bold tracking-[0.3em] text-xl placeholder-game-muted focus:outline-none focus:border-game-blue"
              />
              {importError && <p className="text-game-red text-sm">{importError}</p>}
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
  const [gameMode, setGameMode] = useState('classic');
  const [openInfo, setOpenInfo] = useState(null);
  const [settings, setSettings] = useState({
    gameDuration: 20,
    hidingDuration: 3,
    pingInterval: 3,
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
      const { sessionId } = await createSession(user.uid, user.displayName || user.email, settings, polygon, gameMode);
      navigate(`/lobby/${sessionId}`);
    } catch (e) {
      setError('Fehler beim Erstellen der Session. Bitte versuche es erneut.');
      setLoading(false);
    }
  }

  const modes = [
    { key: 'classic', icon: '🎮', label: 'Klassisch', desc: 'Das originale Versteckspiel — Hider verstecken sich, Seeker spüren sie per GPS-Pings auf. Wer zuerst alle Hider findet, gewinnt.', available: true },
    { key: 'zombie', icon: '🧟', label: 'Zombie Modus', desc: 'Einmal gefangen, immer auf der falschen Seite. Wer als Hider geschnappt wird, wechselt sofort die Seite und jagt von nun an seine ehemaligen Mitspieler. Das Gleichgewicht kann in Sekunden kippen – aus einem Seeker werden zwei, aus zwei werden vier. Das Spiel endet wenn der letzte freie Hider gefangen ist oder die Zeit abläuft.', available: true },
    { key: 'shrink', icon: '🌀', label: 'Schrumpfzone', desc: 'Die Zone gibt euch keine Zeit zum Entspannen. Alle 2 Minuten zieht sich die Spielzone zusammen – unaufhaltsam, wie bei Battle Royale. Wer außerhalb der neuen Zone erwischt wird, ist für alle Spieler sichtbar. Je länger das Spiel dauert, desto enger wird es – und desto schwieriger wird es sich zu verstecken.', available: false },
    { key: 'ghost', icon: '👻', label: 'Unsichtbar', desc: 'Vergiss alles was du über Pings weißt. Im Unsichtbar-Modus gibt es keine Positionshinweise, keine Koordinaten, keine Hilfe. Seeker haben nur ein pulsierendes Näherungs-Radar – es wird schneller je näher ein Hider ist, aber verrät keine Richtung. Reines Instinkt-Spiel. Hider gewinnen automatisch wenn die Zeit abläuft – sie müssen nur lange genug durchhalten.', available: false },
  ];

  const activeMode = openInfo ? modes.find(m => m.key === openInfo) : null;

  return (
    <>
      {/* ── Mode info popup ── */}
      {activeMode && (
        <div
          onClick={() => setOpenInfo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s ease both' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 320,
              background: '#161B22', border: '1px solid #30363D', borderRadius: 16,
              padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'scaleIn 0.22s ease both',
            }}
          >
            <button
              onClick={() => setOpenInfo(null)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.8rem' }}>{activeMode.icon}</span>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>{activeMode.label}</div>
                {!activeMode.available && (
                  <div style={{ color: '#F97316', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Demnächst
                  </div>
                )}
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
              {activeMode.desc}
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1: Settings ── */}
      {step === 1 && (
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

          <div className="relative flex flex-col h-full max-w-sm mx-auto w-full" style={{ zIndex: 1 }}>
            {/* Header */}
            <div
              className="pt-safe px-4 py-6 flex items-center gap-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(48,54,61,0.5)' }}
            >
              <button
                onClick={() => navigate('/home')}
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}
                className="cursor-pointer"
              >
                ←
              </button>
              <h1 className="text-white font-bold text-lg" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                Einstellungen
              </h1>
              <div className="ml-auto flex gap-1">
                {[1, 2].map((s) => (
                  <div key={s} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: step >= s ? '#3B82F6' : 'rgba(48,54,61,0.8)',
                  }} />
                ))}
              </div>
            </div>

            {/* Settings cards */}
            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5">

              {/* Game mode selector */}
              {(() => {
                const infoBtn = (key) => (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenInfo(openInfo === key ? null : key); }}
                    style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 10,
                      width: 22, height: 22, borderRadius: '50%',
                      background: openInfo === key ? '#3B82F6' : 'rgba(59,130,246,0.25)',
                      border: '1.5px solid #3B82F6',
                      color: 'white',
                      fontSize: 12, fontStyle: 'italic', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    i
                  </button>
                );
                const playable = modes.filter((m) => m.available);
                const comingSoon = modes.filter((m) => !m.available);
                return (
                  <div style={{ ...GLASS_CARD, animation: 'fadeInUp 0.4s 0.05s ease both', opacity: 0 }}>
                    <h2 className="text-white font-bold mb-3">Spielmodus</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                      {/* Playable modes */}
                      {playable.map(({ key, icon, label }) => (
                        <div key={key}>
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setGameMode(key)}
                              style={{
                                width: '100%', padding: '14px 12px', borderRadius: 12,
                                border: `2px solid ${gameMode === key ? '#3B82F6' : 'rgba(48,54,61,0.8)'}`,
                                background: gameMode === key ? 'rgba(59,130,246,0.15)' : 'rgba(13,17,23,0.4)',
                                cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                              }}
                            >
                              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{label}</span>
                            </button>
                            {infoBtn(key)}
                          </div>
                        </div>
                      ))}

                      {/* Coming-soon row */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        {comingSoon.map(({ key, icon, label }) => (
                          <div key={key} style={{ flex: 1 }}>
                            <div style={{ position: 'relative' }}>
                              <div style={{
                                padding: '12px 6px', borderRadius: 12,
                                border: '2px solid rgba(48,54,61,0.5)',
                                background: 'rgba(13,17,23,0.25)',
                                textAlign: 'center', opacity: 0.55,
                              }}>
                                <div style={{ fontSize: '1.4rem', marginBottom: 3 }}>{icon}</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.72rem' }}>{label}</div>
                              </div>
                              <div style={{
                                position: 'absolute', top: -7, right: -4,
                                background: '#F97316', color: 'white',
                                fontSize: '0.52rem', fontWeight: 800,
                                padding: '2px 6px', borderRadius: 20,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                boxShadow: '0 2px 8px rgba(249,115,22,0.5)',
                              }}>
                                Demnächst
                              </div>
                              {infoBtn(key)}
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Spielzeit */}
              <div style={{ ...GLASS_CARD, animation: 'fadeInUp 0.4s 0.13s ease both', opacity: 0 }}>
                <h2 className="text-white font-bold mb-4">Spielzeit</h2>
                <div className="flex flex-wrap gap-2">
                  {GAME_DURATION_OPTIONS.map((v) => (
                    <button key={v} onClick={() => setSettings((s) => ({ ...s, gameDuration: v }))}
                      style={optionBtn(settings.gameDuration === v)}>
                      {v} Min
                    </button>
                  ))}
                </div>
              </div>

              {/* Versteckzeit */}
              <div style={{ ...GLASS_CARD, animation: 'fadeInUp 0.4s 0.21s ease both', opacity: 0 }}>
                <h2 className="text-white font-bold mb-4">Versteckzeit</h2>
                <div className="flex flex-wrap gap-2">
                  {HIDING_DURATION_OPTIONS.map((v) => (
                    <button key={v} onClick={() => setSettings((s) => ({ ...s, hidingDuration: v }))}
                      style={optionBtn(settings.hidingDuration === v)}>
                      {v} Min
                    </button>
                  ))}
                </div>
              </div>

              {/* Ping-Intervall */}
              <div style={{ ...GLASS_CARD, animation: 'fadeInUp 0.4s 0.29s ease both', opacity: 0 }}>
                <h2 className="text-white font-bold mb-4">Ping-Intervall</h2>
                <select
                  value={settings.pingInterval}
                  onChange={(e) => setSettings((s) => ({ ...s, pingInterval: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    background: 'rgba(13,17,23,0.6)',
                    border: '1px solid rgba(48,54,61,0.8)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                    minHeight: 48,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v} style={{ background: '#161B22' }}>
                      {v} Minute{v > 1 ? 'n' : ''}
                    </option>
                  ))}
                </select>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: 8 }}>
                  Alle X Minuten erhalten Seeker einen Ping mit Hider-Positionen.
                </p>
              </div>

              <div style={{ animation: 'fadeInUp 0.4s 0.37s ease both', opacity: 0 }}>
                <Button onClick={() => setStep(2)}>Weiter: Zone zeichnen →</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Zone drawing (full-screen map, unchanged) ── */}
      {step === 2 && (
        <div className="fixed inset-0 flex flex-col bg-game-bg z-50">
          <div className="pt-safe px-4 py-3 flex items-center gap-3 border-b border-game-border shrink-0 bg-game-bg">
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
    </>
  );
}
