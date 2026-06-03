import { useMemo } from 'react';
import { haversine } from '../../utils/haversine';

export default function ProximityRadar({ players, myPlayer }) {
  const nearestDistance = useMemo(() => {
    if (!myPlayer?.lat || !myPlayer?.lng) return null;
    const hiders = players.filter(
      (p) => p.role === 'hider' && !p.caught && p.lat != null && p.lng != null
    );
    if (hiders.length === 0) return null;
    return Math.min(...hiders.map((h) => haversine(myPlayer.lat, myPlayer.lng, h.lat, h.lng)));
  }, [players, myPlayer?.lat, myPlayer?.lng]);

  // Pulse duration in seconds — shorter = faster = closer
  const pulseDuration = useMemo(() => {
    if (nearestDistance === null) return 3.0;
    if (nearestDistance < 30)    return 0.35;
    if (nearestDistance < 75)    return 0.7;
    if (nearestDistance < 150)   return 1.3;
    if (nearestDistance < 300)   return 2.0;
    return 3.0;
  }, [nearestDistance]);

  const color = useMemo(() => {
    if (nearestDistance === null) return '#3B82F6';
    if (nearestDistance < 30)    return '#EF4444';
    if (nearestDistance < 75)    return '#F97316';
    if (nearestDistance < 150)   return '#EAB308';
    return '#3B82F6';
  }, [nearestDistance]);

  const ringStyle = (delay = 0) => ({
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: `2px solid ${color}`,
    animation: `radarPulse ${pulseDuration}s ease-out infinite`,
    animationDelay: `${delay}s`,
  });

  return (
    <div style={{
      position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      pointerEvents: 'none',
    }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div key={`r1-${pulseDuration}`} style={ringStyle(0)} />
        <div key={`r2-${pulseDuration}`} style={ringStyle(pulseDuration * 0.5)} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 10, height: 10, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}, 0 0 20px ${color}66`,
          transition: 'background-color 0.5s, box-shadow 0.5s',
        }} />
      </div>
      <span style={{
        color: 'rgba(255,255,255,0.55)', fontSize: '0.6rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        background: 'rgba(13,17,23,0.72)', padding: '2px 8px', borderRadius: 10,
      }}>Radar</span>
    </div>
  );
}
