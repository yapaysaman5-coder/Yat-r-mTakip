import { useEffect, useRef, useState } from 'react';

/**
 * A number that glides to its new value (the balance "counting" to a new total) instead of
 * jumping. Runs ~0,6 s with an ease-out; the first value shows at once.
 */
export function useAnimatedNumber(target: number, durationMs = 600): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const current = useRef(target);
  useEffect(() => {
    from.current = current.current;
    if (from.current === target) return;
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      current.current = from.current + (target - from.current) * eased;
      setShown(current.current);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return shown;
}
