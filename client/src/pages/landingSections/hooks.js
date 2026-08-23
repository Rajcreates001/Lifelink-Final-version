import { useState, useEffect, useRef } from 'react';

// ─── Hook: Animated Counter ─────────────────────────────
export function useCountUp(target, duration = 2000, startOnView = true) {
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

// ─── Hook: Scroll Entrance ────────────────────────────
export function useScrollIn(threshold = 0.15) {
    const [entered, setEntered] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setEntered(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [entered, ref];
}
