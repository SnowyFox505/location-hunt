import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

function makeIcon(roleColor, initials, pulse = false, photoBase64 = null, profileColor = null) {
  const size = 36;
  const borderColor = photoBase64 && profileColor ? profileColor : roleColor;
  const ring = pulse
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${roleColor};opacity:0.5;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : '';
  const inner = photoBase64
    ? `<img src="${photoBase64}" style="width:${size}px;height:${size}px;object-fit:cover;" />`
    : `<div style="width:${size}px;height:${size}px;background:${roleColor};display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:white;font-family:Inter,system-ui,sans-serif;">${initials}</div>`;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${ring}
      <div style="width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid ${borderColor};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.6);">
        ${inner}
      </div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function PlayerMarker({ player, isMe, outOfZone = false }) {
  if (player.lat == null || player.lng == null) return null;

  const initials = (player.name || '?').slice(0, 2).toUpperCase();
  let roleColor;
  if (player.caught) roleColor = '#6B7280';
  else if (player.zombie) roleColor = '#A855F7';
  else if (outOfZone) roleColor = '#F97316';
  else if (player.role === 'hider') roleColor = '#22C55E';
  else roleColor = isMe ? '#3B82F6' : '#60A5FA';

  const icon = makeIcon(
    roleColor,
    initials,
    outOfZone && !player.caught,
    player.caught ? null : player.photoBase64,
    player.caught ? null : player.profileColor,
  );

  const label = player.caught
    ? `${player.name} (gefangen)`
    : outOfZone
      ? `${player.name} ⚠ außerhalb der Zone`
      : player.name;

  return (
    <Marker position={[player.lat, player.lng]} icon={icon}>
      <Tooltip permanent={false} direction="top" offset={[0, -20]} className="player-tooltip">
        {label}
      </Tooltip>
    </Marker>
  );
}
