import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, useMapEvent } from 'react-leaflet';
import PlayerMarker from './PlayerMarker';
import PingMarker from './PingMarker';

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: false });
  }, [center?.[0], center?.[1]]);
  return null;
}

function MapClickCapture({ onClick }) {
  useMapEvent('click', (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
  return null;
}

// Large outer ring used to create the inverted zone mask
const WORLD_RING = [[-85, -180], [-85, 180], [85, 180], [85, -180]];

export default function GameMap({
  center, zoom = 17, zone, players = [], outOfZonePlayers = [],
  pings = null, myUid, showPlayers = true, showPings = false, onMapClick = null,
  shrinkZones = null, currentShrinkStep = 0, gracePeriodActive = false,
}) {
  const [displayZoneCoords, setDisplayZoneCoords] = useState(null);
  const animFrameRef = useRef(null);

  // Initialize display zone to step 0 when shrink mode activates
  useEffect(() => {
    if (shrinkZones?.length > 0 && !displayZoneCoords) {
      setDisplayZoneCoords(shrinkZones[0].map((p) => [p.lat, p.lng]));
    }
  }, [shrinkZones]);

  // Animate zone border when currentShrinkStep advances
  useEffect(() => {
    if (!shrinkZones || currentShrinkStep === 0) return;
    const fromZone = shrinkZones[currentShrinkStep - 1];
    const toZone = shrinkZones[currentShrinkStep];
    if (!fromZone || !toZone) return;

    const fromCoords = fromZone.map((p) => [p.lat, p.lng]);
    const toCoords = toZone.map((p) => [p.lat, p.lng]);
    const startTime = performance.now();
    const duration = 2500;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayZoneCoords(fromCoords.map((pt, i) => [
        pt[0] + (toCoords[i][0] - pt[0]) * ease,
        pt[1] + (toCoords[i][1] - pt[1]) * ease,
      ]));
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [currentShrinkStep]);

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

  // Use animated coords in shrink mode, otherwise static zone
  const activeZoneCoords = shrinkZones
    ? (displayZoneCoords || shrinkZones[currentShrinkStep]?.map((p) => [p.lat, p.lng]))
    : (zone ? zone.map((p) => [p.lat, p.lng]) : null);
  const hasZone = activeZoneCoords && activeZoneCoords.length >= 3;

  // Dashed preview ring showing the next shrink boundary
  const nextZoneCoords =
    shrinkZones && currentShrinkStep < shrinkZones.length - 1
      ? shrinkZones[currentShrinkStep + 1].map((p) => [p.lat, p.lng])
      : null;

  return (
    <MapContainer
      center={center || [51.505, -0.09]}
      zoom={zoom}
      className="w-full h-full"
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='© OpenStreetMap contributors © CARTO'
        subdomains="abcd"
        maxZoom={19}
      />

      {/* Dark mask covering everything outside the zone */}
      {hasZone && (
        <Polygon
          positions={[WORLD_RING, activeZoneCoords]}
          pathOptions={{ fillColor: '#0D1117', fillOpacity: 0.82, stroke: false, weight: 0 }}
        />
      )}

      {/* Zone border — red when grace period active */}
      {hasZone && (
        <Polygon
          positions={activeZoneCoords}
          pathOptions={{
            color: gracePeriodActive ? '#EF4444' : '#3B82F6',
            weight: gracePeriodActive ? 3 : 2.5,
            fill: false,
          }}
        />
      )}

      {/* Dashed preview ring showing next shrink boundary */}
      {nextZoneCoords && (
        <Polygon
          positions={nextZoneCoords}
          pathOptions={{ color: '#EF4444', weight: 1.5, fill: false, dashArray: '6, 8', opacity: 0.6 }}
        />
      )}

      {showPlayers && players.map((p) => (
        <PlayerMarker key={p.uid} player={p} isMe={p.uid === myUid} outOfZone={outOfZonePlayers.includes(p.uid)} />
      ))}
      {showPings && pingEntries.map(({ uid, data, timestamp }) => (
        <PingMarker key={`${uid}-${timestamp}`} uid={uid} data={data} timestamp={timestamp} />
      ))}
      {onMapClick && <MapClickCapture onClick={onMapClick} />}
      {center && <RecenterMap center={center} />}
    </MapContainer>
  );
}
