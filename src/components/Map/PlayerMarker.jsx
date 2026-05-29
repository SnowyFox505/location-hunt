import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

function makeIcon(color, initials, size = 36) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.6);font-family:Inter,system-ui,sans-serif;">${initials}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function PlayerMarker({ player, isMe }) {
  if (player.lat == null || player.lng == null) return null;

  const initials = (player.name || '?').slice(0, 2).toUpperCase();
  let color;
  if (player.caught) color = '#6B7280';
  else if (player.role === 'hider') color = isMe ? '#22C55E' : '#22C55E';
  else color = isMe ? '#3B82F6' : '#60A5FA';

  const icon = makeIcon(color, initials);

  return (
    <Marker position={[player.lat, player.lng]} icon={icon}>
      <Tooltip permanent={false} direction="top" offset={[0, -20]}>
        <span style={{ color: '#E6EDF3', fontSize: 12 }}>
          {player.name}{player.caught ? ' (gefangen)' : ''}
        </span>
      </Tooltip>
    </Marker>
  );
}
