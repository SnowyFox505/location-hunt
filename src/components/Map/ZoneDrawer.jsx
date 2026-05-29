import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';

function DrawControl({ onPolygonDrawn }) {
  const map = useMap();
  const drawnRef = useRef(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          shapeOptions: { color: '#3B82F6', fillOpacity: 0.1 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: drawnItems, remove: false },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const latlngs = e.layer.getLatLngs()[0];
      const polygon = latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
      onPolygonDrawn(polygon);
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED);
    };
  }, [map, onPolygonDrawn]);

  return null;
}

export default function ZoneDrawer({ center, polygon, onPolygonDrawn }) {
  return (
    <MapContainer
      center={center || [51.505, -0.09]}
      zoom={16}
      className="w-full h-full"
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <DrawControl onPolygonDrawn={onPolygonDrawn} />
      {polygon && polygon.length >= 3 && (
        <Polygon
          positions={polygon.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.1, weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
