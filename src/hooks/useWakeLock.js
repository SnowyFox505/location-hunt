import { useEffect, useRef } from 'react';

export function useWakeLock(active = true) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let cancelled = false;

    async function acquire() {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {}
    }

    acquire();

    // iOS releases the lock when the tab goes background; re-acquire on return
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !cancelled) acquire();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
