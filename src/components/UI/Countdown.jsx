import { useState, useEffect } from 'react';

export default function Countdown({ endsAt, onComplete, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, endsAt - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0 && onComplete) onComplete();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, onComplete]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className={className}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
