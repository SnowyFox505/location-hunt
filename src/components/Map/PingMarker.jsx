import { useState, useEffect } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function makePingIcon(initials) {
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:#EF4444;border-radius:50%;border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:white;box-shadow:0 0 12px rgba(239,68,68,0.6);font-family:Inter,system-ui,sans-serif;">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function PingMarker({ uid, data, timestamp }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const age = Date.now() - timestamp;
    const remaining = Math.max(0, 30000 - age);
    if (remaining === 0) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(t);
  }, [timestamp]);

  if (!visible || data.lat == null || data.lng == null) return null;

  const initials = (data.name || '?').slice(0, 2).toUpperCase();
  const timeStr = format(new Date(timestamp), 'HH:mm', { locale: de });

  return (
    <Marker position={[data.lat, data.lng]} icon={makePingIcon(initials)}>
      <Tooltip permanent direction="top" offset={[0, -20]}>
        <span style={{ color: '#E6EDF3', fontSize: 11 }}>
          {data.name} – {timeStr}
        </span>
      </Tooltip>
    </Marker>
  );
}
