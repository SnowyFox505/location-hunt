export const VIBRATIONS = {
  ping: [100, 50, 100],
  caught: [500],
  campingBonus: [200, 100, 200],
  gameEnd: [200, 100, 200, 100, 400],
};

export function vibrate(pattern) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
