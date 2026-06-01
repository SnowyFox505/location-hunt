import { useState, useEffect } from 'react';

export default function Countdown({ endsAt, onComplete, className = '', urgencyThreshold = 60 }) {
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
  const isUrgent = urgencyThreshold > 0 && totalSeconds <= urgencyThreshold && totalSeconds > 0;

  return (
    <span
      className={className}
      style={isUrgent ? { color: '#EF4444', animation: 'countdownPulse 0.9s ease-in-out infinite' } : undefined}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
