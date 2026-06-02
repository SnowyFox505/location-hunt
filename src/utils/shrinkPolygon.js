function computeCentroid(polygon) {
  const lat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const lng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
  return { lat, lng };
}

function shrinkPolygon(polygon, factor) {
  const c = computeCentroid(polygon);
  return polygon.map((p) => ({
    lat: c.lat + (p.lat - c.lat) * factor,
    lng: c.lng + (p.lng - c.lng) * factor,
  }));
}

// Returns array of polygons: [original, step1, step2] (max 2 shrinks)
// Final zone is ~50% of the original area
export function computeShrinkZones(polygon, gameDurationMinutes) {
  const steps = Math.min(2, Math.floor(gameDurationMinutes / 2));
  if (steps === 0) return [polygon];
  const perStepFactor = Math.pow(0.5, 1 / steps);
  const zones = [polygon];
  let current = polygon;
  for (let i = 0; i < steps; i++) {
    current = shrinkPolygon(current, perStepFactor);
    zones.push(current);
  }
  return zones;
}
