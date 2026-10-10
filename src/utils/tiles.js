const KEY = import.meta.env.VITE_CARTO_API_KEY;

export const cartoTileUrl = (style) =>
  `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png${KEY ? `?key=${KEY}` : ''}`;
