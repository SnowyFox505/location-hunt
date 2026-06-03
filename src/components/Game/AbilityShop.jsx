import { useState } from 'react';
import { ref, runTransaction, update, set } from 'firebase/database';
import { db } from '../../firebase';
import { randomPointInPolygon } from '../../utils/randomPointInPolygon';

const ITEMS = {
  hider: [
    {
      key: 'fakePing', icon: '🎭', label: 'Fake Ping', cost: 4,
      desc: 'Dein nächster Ping zeigt eine zufällige Fake-Position innerhalb der Zone.',
    },
    {
      key: 'ghost', icon: '👻', label: 'Ghost', cost: 6,
      desc: 'Du wirst beim nächsten Ping komplett übersprungen. Einmal pro Runde.',
    },
  ],
  seeker: [
    {
      key: 'radar', icon: '🧭', label: 'Radar', cost: 3,
      desc: 'Zeigt 15 Sekunden lang die Richtung zum nächsten Hider — kein genauer Standort.',
    },
    {
      key: 'instantPing', icon: '📡', label: 'Sofort-Ping', cost: 8,
      desc: 'Löst sofort einen extra Ping aus. Der normale Ping-Timer läuft weiter.',
    },
  ],
};

export default function AbilityShop({ sessionId, myPlayer, players, zone, onClose }) {
  const [buying, setBuying] = useState(null);
  const [feedback, setFeedback] = useState('');

  const role = myPlayer?.role === 'seeker' ? 'seeker' : 'hider';
  const items = ITEMS[role] || [];
  const points = myPlayer?.points || 0;

  function showFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  }

  async function handleBuy(item) {
    if (buying) return;
    setBuying(item.key);
    try {
      let committed = false;

      await runTransaction(ref(db, `sessions/${sessionId}/players/${myPlayer.uid}`), (player) => {
        if (!player || (player.points || 0) < item.cost) return;
        if (item.key === 'ghost' && player.ghostUsed) return;
        committed = true;
        const flags = {};
        if (item.key === 'fakePing') flags.fakePingActive = true;
        if (item.key === 'ghost') { flags.ghostActive = true; flags.ghostUsed = true; }
        return { ...player, points: (player.points || 0) - item.cost, ...flags };
      });

      if (!committed) {
        if (item.key === 'ghost' && myPlayer.ghostUsed) showFeedback('Ghost bereits einmal benutzt.');
        else showFeedback('Nicht genug Punkte.');
        return;
      }

      if (item.key === 'radar') {
        await set(ref(db, `sessions/${sessionId}/abilities/radar/${myPlayer.uid}`), {
          expiresAt: Date.now() + 15_000,
        });
        showFeedback('Radar aktiv — 15 Sekunden!');
        onClose();
      } else if (item.key === 'instantPing') {
        const batch = {};
        const pingData = {};
        players.forEach((p) => {
          if (p.role !== 'hider' || p.caught) return;
          if (p.ghostActive) {
            batch[`players/${p.uid}/ghostActive`] = null;
            return;
          }
          if (p.fakePingActive) {
            const pos = randomPointInPolygon(zone);
            if (pos) pingData[p.uid] = { lat: pos.lat, lng: pos.lng, name: p.name };
            batch[`players/${p.uid}/fakePingActive`] = null;
            return;
          }
          if (p.lat != null && p.lng != null) {
            pingData[p.uid] = { lat: p.lat, lng: p.lng, name: p.name };
          }
        });
        if (Object.keys(pingData).length > 0) batch[`pings/${Date.now()}`] = pingData;
        if (Object.keys(batch).length > 0) await update(ref(db, `sessions/${sessionId}`), batch);
        showFeedback('Ping ausgelöst!');
        onClose();
      } else {
        showFeedback(item.key === 'fakePing'
          ? 'Nächster Ping wird gefälscht!'
          : 'Du bist beim nächsten Ping unsichtbar!'
        );
        onClose();
      }
    } catch {
      showFeedback('Fehler — bitte erneut versuchen.');
    } finally {
      setBuying(null);
    }
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
        backgroundColor: '#161B22', borderTop: '1px solid #30363D',
        borderRadius: '20px 20px 0 0', padding: '20px 16px 40px',
        animation: 'slideInUp 0.25s ease both',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#30363D', margin: '0 auto 16px' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-game-text font-bold text-lg">⚡ Fähigkeiten</h2>
          <div style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 20, padding: '4px 14px',
            color: '#3B82F6', fontWeight: 700, fontSize: '0.9rem',
          }}>
            {points} Punkte
          </div>
        </div>

        {feedback && (
          <div style={{
            background: 'rgba(34,197,94,0.12)', border: '1px solid #22C55E',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            color: '#22C55E', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
            animation: 'fadeIn 0.2s ease both',
          }}>
            {feedback}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isGhostUsed = item.key === 'ghost' && myPlayer?.ghostUsed;
            const canAfford = points >= item.cost;
            const disabled = !!buying || isGhostUsed || !canAfford;
            return (
              <div key={item.key} style={{
                backgroundColor: '#0D1117', border: '1px solid #30363D',
                borderRadius: 14, padding: '14px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isGhostUsed ? 0.45 : 1,
              }}>
                <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.71rem', lineHeight: 1.4, marginTop: 2 }}>
                    {isGhostUsed ? 'Bereits benutzt — nur 1× pro Runde' : item.desc}
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={disabled}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                    background: !disabled ? '#3B82F6' : 'rgba(48,54,61,0.5)',
                    border: 'none',
                    color: !disabled ? 'white' : 'rgba(255,255,255,0.25)',
                    fontWeight: 700, fontSize: '0.82rem',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {buying === item.key ? '…' : `⚡ ${item.cost}`}
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="w-full mt-4 py-3 text-game-muted text-sm cursor-pointer">
          Schließen
        </button>
      </div>
    </>
  );
}
