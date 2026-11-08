import React, { useEffect, useId, useRef, useState } from "react";
import { money, shortDate } from "./format";

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, width];
}

// Round a step up to 1, 2 or 5 times a power of ten.
function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

// points: [{ date, time, value }]. baseline draws the paid level and fills the gap.
export default function Timeline({
  points,
  selected,
  onSelect,
  height,
  compact = false,
  baseline = null,
  label,
}) {
  const [wrap, width] = useWidth();
  const gradId = useId();
  const pad = compact
    ? { l: 10, r: 10, t: 10, b: 10 }
    : { l: 62, r: 14, t: 14, b: 34 };
  const w = Math.max(width, 10);
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const values = points.map((p) => p.value);
  const hi = Math.max(...values, baseline ?? 0);
  const lo = Math.min(...values, baseline ?? 0, 0);
  const step = niceStep((hi - lo) / 4 || 1);
  const yMax = compact ? hi * 1.05 : Math.ceil(hi / step) * step;
  const yMin = compact ? Math.min(lo, 0) : Math.floor(lo / step) * step;
  const t0 = points[0].time;
  const t1 = points.at(-1).time;
  const x = (t) =>
    pad.l + (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
  const y = (v) => pad.t + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const line = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join("");
  const base = baseline ?? yMin;
  const area =
    line +
    `L${x(t1).toFixed(1)},${y(base).toFixed(1)}L${x(t0).toFixed(1)},${y(base).toFixed(1)}Z`;

  const yTicks = [];
  if (!compact) for (let v = yMin; v <= yMax + 1e-6; v += step) yTicks.push(v);
  const xTicks = [];
  if (!compact && points.length > 1)
    for (let i = 0; i <= 4; i++) xTicks.push(t0 + ((t1 - t0) * i) / 4);

  const index = points.findIndex((p) => p.date === selected);
  const current = index >= 0 ? points[index] : null;

  function nearest(e) {
    const rect = wrap.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++)
      if (
        Math.abs(x(points[i].time) - px) < Math.abs(x(points[best].time) - px)
      )
        best = i;
    return points[best].date;
  }
  const down = useRef(false);
  const onKey = (e) => {
    const i = index < 0 ? points.length - 1 : index;
    const next = {
      ArrowLeft: i - 1,
      ArrowDown: i - 1,
      ArrowRight: i + 1,
      ArrowUp: i + 1,
      Home: 0,
      End: points.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onSelect(points[Math.max(0, Math.min(points.length - 1, next))].date);
  };

  return (
    <div
      ref={wrap}
      className={"timeline" + (compact ? " compact" : "")}
      style={{ height }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={points.length - 1}
      aria-valuenow={Math.max(index, 0)}
      aria-valuetext={
        current
          ? `${shortDate(current.date)}, ${money(current.value)}`
          : undefined
      }
      onKeyDown={onKey}
      onPointerDown={(e) => {
        down.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onSelect(nearest(e));
      }}
      onPointerMove={(e) => down.current && onSelect(nearest(e))}
      onPointerUp={() => (down.current = false)}
      onPointerCancel={() => (down.current = false)}
    >
      {width > 0 && (
        <svg width={w} height={height} aria-hidden="true">
          <defs>
            <linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={pad.t}
              y2={height - pad.b}
            >
              <stop offset="0" stopColor="#ff6b2c" stopOpacity="0.42" />
              <stop offset="1" stopColor="#ff6b2c" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((v) => (
            <g key={v}>
              <line
                className="grid"
                x1={pad.l}
                x2={w - pad.r}
                y1={y(v)}
                y2={y(v)}
              />
              <text
                className="axis"
                x={pad.l - 10}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {"$" + Math.round(v).toLocaleString()}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={i}
              className="axis"
              x={x(t)}
              y={height - 8}
              textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
            >
              {shortDate(Math.round(t))}
            </text>
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path className="line" d={line} pathLength="1" />
          {baseline !== null && (
            <>
              <line
                className="paid"
                x1={pad.l}
                x2={w - pad.r}
                y1={y(baseline)}
                y2={y(baseline)}
              />
              {!compact && (
                <text
                  className="axis paid-text"
                  x={w - pad.r}
                  y={y(baseline) + 16}
                  textAnchor="end"
                >
                  Paid {money(baseline)}
                </text>
              )}
            </>
          )}
          {points.map((p) => (
            <circle
              key={p.date}
              className="dot"
              cx={x(p.time)}
              cy={y(p.value)}
              r={compact ? 2.5 : 3.5}
            />
          ))}
          {current && (
            <g>
              <line
                className="playhead"
                x1={x(current.time)}
                x2={x(current.time)}
                y1={pad.t - 4}
                y2={height - pad.b + 4}
              />
              <circle
                className="handle"
                cx={x(current.time)}
                cy={y(current.value)}
                r={compact ? 7 : 8}
              />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
