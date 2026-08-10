import { useEffect, useRef, useState } from 'react';

// Animated counter that eases toward a target value.
export function useCountUp(target, { duration = 1200, decimals = 0, enabled = true } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) { setValue(Number(target) || 0); return; }
    const to = Number(target) || 0;
    if (ref.current) cancelAnimationFrame(ref.current);
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setValue(from + (to - from) * eased);
      if (p < 1) ref.current = requestAnimationFrame(tick);
      else setValue(to);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration, enabled]);

  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Formats a count value with a prefix/suffix while it animates.
export function useAnimatedNumber(target, options = {}) {
  const value = useCountUp(target, options);
  return formatNumber(value, options);
}

function formatNumber(value, { decimals = 0, compact = false }) {
  const v = Number(value) || 0;
  if (compact && v >= 1000) {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return `${(v / 1e3).toFixed(1)}k`;
  }
  if (decimals) return v.toFixed(decimals);
  return Math.round(v).toLocaleString();
}

// True on first mount, then false — for "reveal on load" animations.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);
  return mounted;
}

// Animated typing effect for AI cursor / command line.
export function useTypewriter(text, { speed = 32, startDelay = 0, enabled = true } = {}) {
  const [output, setOutput] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) { setOutput(text); setDone(true); return; }
    let i = 0;
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOutput(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [text, speed, startDelay, enabled]);

  return { output, done };
}
