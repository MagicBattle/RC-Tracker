import { useEffect, useRef, useState } from "react";

const reduced =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animates a number toward target.
export function useTween(
  target,
  { delay = 0, duration = 1800 } = {},
  restart = 0,
) {
  const [value, setValue] = useState(reduced ? target : 0);
  const s = useRef({ v: reduced ? target : 0, first: true });
  const last = useRef(restart);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const st = s.current;
    if (target === 0 && st.first) return;
    if (last.current !== restart) {
      last.current = restart;
      st.first = true;
      st.v = 0;
    }
    const from = st.v;
    const first = st.first;
    st.first = false;
    const t0 = performance.now() + (first ? delay : 0);
    const dur = first ? duration : 700;
    let raf;
    const tick = (now) => {
      const k = Math.min(Math.max((now - t0) / dur, 0), 1);
      st.v = from + (target - from) * (1 - Math.pow(1 - k, 4));
      setValue(st.v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, restart]);
  return value;
}
