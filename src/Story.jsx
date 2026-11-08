import React, { useEffect, useRef } from "react";
import { money } from "./format";
import ProductImg from "./ProductImg";

const clamp = (x, a = 0, b = 1) => Math.min(Math.max(x, a), b);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Calls update(progress) while a tall section scrolls past a sticky frame.
function useScrollProgress(ref, update, deps) {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(r.height - window.innerHeight, 1);
      update(clamp(-r.top / span));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, deps);
}

// A sentence that lights up word by word. parts: [[text, isEmber], ...]
export function Statement({ parts }) {
  const section = useRef(null);
  const words = useRef([]);
  const list = parts.flatMap(([text, ember]) =>
    text
      .split(" ")
      .filter(Boolean)
      .map((w) => [w, ember]),
  );
  useScrollProgress(
    section,
    (p) => {
      const n = words.current.length;
      words.current.forEach((el, i) => {
        if (!el) return;
        const k = reduced() ? 1 : clamp(p * 1.35 * n - i);
        el.style.opacity = 0.14 + 0.86 * k;
        el.style.filter = `blur(${(1 - k) * 3}px)`;
      });
    },
    [parts.map((p) => p[0]).join()],
  );
  return (
    <section className="statement" ref={section} aria-label="Summary">
      <div className="statement-stage">
        <p>
          {list.map(([w, ember], i) => (
            <span
              key={i}
              ref={(n) => (words.current[i] = n)}
              className={ember ? "ember" : ""}
            >
              {w}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

// Each product is dealt onto a pile while the missed total counts up.
export function DealtCards({ rows }) {
  const section = useRef(null);
  const cards = useRef([]);
  const total = useRef(null);
  const step = useRef(null);
  const name = useRef(null);
  const detail = useRef(null);
  const n = rows.length;

  useScrollProgress(
    section,
    (p) => {
      const f = clamp(p / 0.86) * n;
      let sum = 0;
      rows.forEach((row, i) => {
        const local = clamp(f - i);
        sum += Math.max(row.missed, 0) * local;
        const card = cards.current[i];
        if (!card) return;
        const e = reduced() ? (local > 0 ? 1 : 0) : 1 - Math.pow(1 - local, 3);
        const above = clamp(f - i - 1, 0, 4);
        const rot = (i % 2 ? 1 : -1) * (2 + ((i * 7) % 5));
        card.style.opacity = local > 0 ? 1 : 0;
        card.style.transform =
          `translate3d(${(1 - e) * 60}px, calc(${(1 - e) * 105}vh - ${above * 12}px), 0) ` +
          `rotate(${rot * e + (1 - e) * 16}deg) scale(${1 - above * 0.035})`;
        card.style.filter = `brightness(${1 - above * 0.16})`;
        card.classList.toggle("active", local > 0 && f - i < 1);
      });
      const cur = rows[clamp(Math.ceil(f) - 1, 0, n - 1)];
      if (total.current) total.current.textContent = money(sum);
      if (step.current)
        step.current.textContent = `${String(Math.max(Math.ceil(f), 1)).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      if (name.current) name.current.textContent = cur.short;
      if (detail.current)
        detail.current.textContent = `Paid ${money(cur.msrp)}, now ${money(cur.now)} each${cur.qty > 1 ? `, ×${cur.qty}` : ""}`;
    },
    [rows.map((r) => r.id + ":" + r.now).join()],
  );

  return (
    <section
      id="went"
      className="dealt"
      ref={section}
      style={{ height: `calc(100vh + ${n} * 55vh)` }}
    >
      <div className="dealt-stage">
        <div className="dealt-copy">
          <h2>
            Where it <em>went</em>
          </h2>
          <p className="dealt-step" ref={step}>
            01 / {String(n).padStart(2, "0")}
          </p>
          <p className="dealt-name" ref={name}>
            {rows[0]?.short}
          </p>
          <p className="dealt-detail" ref={detail} />
          <div className="dealt-total">
            <span>Missed so far</span>
            <strong className="ember" ref={total}>
              $0.00
            </strong>
          </div>
        </div>
        <div className="pile" aria-hidden="true">
          {rows.map((row, i) => (
            <article
              key={row.id}
              className="deal-card"
              ref={(el) => (cards.current[i] = el)}
              style={{ "--set": row.color, zIndex: i }}
            >
              <div className="art">
                <span className="art-name">{row.set}</span>
                <ProductImg id={row.id} />
              </div>
              <div className="deal-meta">
                <strong>{row.set}</strong>
                <small>
                  {row.kind}
                  {row.qty > 1 ? `, ×${row.qty}` : ""}
                </small>
              </div>
              <dl className="deal-nums">
                <div>
                  <dt>Paid</dt>
                  <dd>{money(row.msrp)}</dd>
                </div>
                <div>
                  <dt>Now</dt>
                  <dd>{money(row.now)}</dd>
                </div>
                <div>
                  <dt>Multiple</dt>
                  <dd className="ember">{(row.now / row.msrp).toFixed(1)}×</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// Adds .in to [data-reveal] elements once they enter the viewport.
export function useReveal(deps) {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]:not(.in)");
    if (reduced()) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps);
}
