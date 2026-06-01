import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

function makePingIcon(initials) {
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:#EF4444;border-radius:50%;border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:white;box-shadow:0 0 12px rgba(239,68,68,0.6);font-family:Inter,system-ui,sans-serif;animation:pingPop 0.4s ease-out both;">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function PingMarker({ uid, data, timestamp }) {
  if (data.lat == null || data.lng == null) return null;

  const initials = (data.name || '?').slice(0, 2).toUpperCase();
  const timeStr = format(new Date(timestamp), 'HH:mm', { locale: de });
  const icon = useMemo(() => makePingIcon(initials), [initials]);

  return (
    <Marker position={[data.lat, data.lng]} icon={icon}>
      <Tooltip permanent direction="top" offset={[0, -20]} className="player-tooltip">
        {data.name} – {timeStr}
      </Tooltip>
    </Marker>
  );
}
