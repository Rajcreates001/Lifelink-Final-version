import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — Animates a number from 0 to target on viewport entry.
 *
 * @param {number} target - Final value to count up to
 * @param {number} duration - Animation duration in ms (default 1500)
 * @param {boolean} startOnView - Only start animating when element enters viewport (default true)
 * @returns {[number, React.RefObject]} [current count, ref to attach to observed element]
 */
export function useCountUp(target, duration = 1500, startOnView = true) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(!startOnView);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);

  return [count, ref];
}
