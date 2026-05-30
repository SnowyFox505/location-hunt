import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import PlayerMarker from './PlayerMarker';
import PingMarker from './PingMarker';

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: false });
  }, [center?.[0], center?.[1]]);
  return null;
}

// Large outer ring used to create the inverted zone mask
const WORLD_RING = [[-85, -180], [-85, 180], [85, 180], [85, -180]];

export default function GameMap({ center, zoom = 17, zone, players = [], outOfZonePlayers = [], pings = null, myUid, showPlayers = true, showPings = false }) {
  // Keep only the latest ping per hider (replaces old one when new ping arrives)
  const pingEntries = pings
    ? Object.entries(
        Object.entries(pings).reduce((latest, [ts, pingPlayers]) => {
          const t = parseInt(ts);
          Object.entries(pingPlayers).forEach(([uid, data]) => {
            if (!latest[uid] || t > latest[uid].timestamp) {
              latest[uid] = { data, timestamp: t };
            }
          });
          return latest;
        }, {})
      ).map(([uid, { data, timestamp }]) => ({ uid, data, timestamp }))
    : [];

  const hasZone = zone && zone.length >= 3;
  const zoneCoords = hasZone ? zone.map((p) => [p.lat, p.lng]) : null;

  return (
    <MapContainer
      center={center || [51.505, -0.09]}
      zoom={zoom}
      className="w-full h-full"
      zoomControl
      attributionControl={false}
    >
      {/* Light map tiles — zone interior is clearly readable */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='© OpenStreetMap contributors © CARTO'
        subdomains="abcd"
        maxZoom={19}
      />

      {/* Dark mask covering everything outside the zone */}
      {hasZone && (
        <Polygon
          positions={[WORLD_RING, zoneCoords]}
          pathOptions={{ fillColor: '#0D1117', fillOpacity: 0.82, stroke: false, weight: 0 }}
        />
      )}

      {/* Zone border */}
      {hasZone && (
        <Polygon
          positions={zoneCoords}
          pathOptions={{ color: '#3B82F6', weight: 2.5, fill: false }}
        />
      )}

      {showPlayers && players.map((p) => (
        <PlayerMarker key={p.uid} player={p} isMe={p.uid === myUid} outOfZone={outOfZonePlayers.includes(p.uid)} />
      ))}
      {showPings && pingEntries.map(({ uid, data, timestamp }) => (
        <PingMarker key={`${uid}-${timestamp}`} uid={uid} data={data} timestamp={timestamp} />
      ))}
      {center && <RecenterMap center={center} />}
    </MapContainer>
  );
}
