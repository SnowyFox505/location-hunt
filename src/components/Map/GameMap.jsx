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

export default function GameMap({ center, zoom = 17, zone, players = [], pings = null, myUid, showPlayers = true, showPings = false }) {
  const pingEntries = pings
    ? Object.entries(pings).flatMap(([ts, pingPlayers]) =>
        Object.entries(pingPlayers).map(([uid, data]) => ({ uid, data, timestamp: parseInt(ts) }))
      )
    : [];

  return (
    <MapContainer
      center={center || [51.505, -0.09]}
      zoom={zoom}
      className="w-full h-full"
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='© OpenStreetMap contributors © CARTO'
        subdomains="abcd"
        maxZoom={19}
      />
      {zone && zone.length >= 3 && (
        <Polygon
          positions={zone.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 2 }}
        />
      )}
      {showPlayers && players.map((p) => (
        <PlayerMarker key={p.uid} player={p} isMe={p.uid === myUid} />
      ))}
      {showPings && pingEntries.map(({ uid, data, timestamp }) => (
        <PingMarker key={`${uid}-${timestamp}`} uid={uid} data={data} timestamp={timestamp} />
      ))}
      {center && <RecenterMap center={center} />}
    </MapContainer>
  );
}
