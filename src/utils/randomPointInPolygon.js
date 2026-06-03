import { pointInPolygon } from './pointInPolygon';

export function randomPointInPolygon(polygon, maxAttempts = 30) {
  if (!polygon || polygon.length < 3) return null;
  const lats = polygon.map((p) => p.lat);
  const lngs = polygon.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  for (let i = 0; i < maxAttempts; i++) {
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);
    if (pointInPolygon(lat, lng, polygon)) return { lat, lng };
  }
  // Fallback: centroid
  return {
    lat: lats.reduce((s, v) => s + v, 0) / lats.length,
    lng: lngs.reduce((s, v) => s + v, 0) / lngs.length,
  };
}
