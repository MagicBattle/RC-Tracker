import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { inventory, cost, total, changeSince, isOut } from "./data";
import { money, shortDate, longDate } from "./format";
import AshScene from "./AshScene";
import ProductImg from "./ProductImg";
import Timeline from "./Timeline";
import { useTween } from "./useTween";
import { Statement, DealtCards, useReveal } from "./Story";
import "./style.css";

const RANGES = [
  ["1W", 7],
  ["1M", 30],
  ["1Y", 365],
  ["All", Infinity],
];
const BOX_COUNT = inventory.reduce((n, p) => n + p.qty, 0);

function Mark() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="5" fill="currentColor" />
      <path
        d="M6 14V6h4.2a2.4 2.4 0 0 1 0 4.8H6M10 10.8 13.5 14"
        fill="none"
        stroke="#0c0907"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState("All");
  const [metric, setMetric] = useState("sealed");
  const [picked, setPicked] = useState(null);
  const [introKey, setIntroKey] = useState(0);
  const timer = useRef(0);

  async function load() {
    try {
      const r = await fetch(import.meta.env.BASE_URL + "data/history.json", {
        cache: "no-cache",
      });
      if (!r.ok) throw Error();
      const d = await r.json();
      d.history.forEach((s) => total(s.prices, s.date));
      if (!d.history.length) throw Error();
      setData(d);
      setError("");
    } catch {
      setError("Prices could not load. Try again in a moment.");
    }
  }
  useEffect(() => {
    load();
    const reload = setInterval(load, 3600000);
    return () => {
      clearInterval(reload);
      clearInterval(timer.current);
    };
  }, []);

  const history = data?.history ?? [];
  const last = history.at(-1);
  const selected = history.find((s) => s.date === picked) ?? last;
  const selIndex = selected ? history.indexOf(selected) : -1;
  const sealed = selected ? total(selected.prices, selected.date) : 0;
  const latest = last ? total(last.prices, last.date) : 0;
  const stale = last && Date.now() - Date.parse(last.fetchedAt) > 48 * 3600000;
  const missedH = useTween(
    Math.max(latest - cost, 0),
    { delay: 700, duration: 1800 },
    introKey,
  );

  const all = history.map((s) => ({
    date: s.date,
    time: Date.parse(s.date + "T12:00:00Z"),
    value: total(s.prices, s.date),
  }));
  const days = RANGES.find(([name]) => name === range)[1];
  const chart = all
    .filter((p) => (all.at(-1).time - p.time) / 86400000 <= days)
    .map((p) => ({ ...p, value: p.value - (metric === "profit" ? cost : 0) }));

  function pick(date) {
    clearInterval(timer.current);
    setPicked(date);
  }
  function play() {
    clearInterval(timer.current);
    const pts = chart;
    let i = 0;
    setPicked(pts[0].date);
    timer.current = setInterval(() => {
      i++;
      if (i >= pts.length) {
        clearInterval(timer.current);
        setPicked(null);
        return;
      }
      setPicked(pts[i].date);
    }, 260);
  }
  function download() {
    const csv = [
      "Date,Sealed value USD,Missed gross profit USD",
      ...all.map(
        (p) => `${p.date},${p.value.toFixed(2)},${(p.value - cost).toFixed(2)}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rc-tracker.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = selected
    ? inventory
        .map((p) => {
          const out = isOut(p, selected.date);
          const now = out ? selected.prices[p.id] : null;
          return {
            ...p,
            now,
            missed: out ? Math.round((now - p.msrp) * p.qty * 100) / 100 : 0,
          };
        })
        .sort((a, b) => b.missed - a.missed)
    : [];
  const maxMissed = Math.max(...rows.map((r) => r.missed), 1);
  const upTo = history.slice(0, selIndex + 1);
  const deltas = [
    [1, "Past day"],
    [7, "Past week"],
  ].map(([d, name]) => [name, changeSince(upTo, d)]);
  if (selIndex > 0)
    deltas.push([
      "Since " + shortDate(history[0].date),
      Math.round((sealed - total(history[0].prices, history[0].date)) * 100) /
        100,
    ]);

  const latestRows = last
    ? inventory
        .map((p) => {
          const now = last.prices[p.id];
          return {
            ...p,
            now,
            missed: Math.round((now - p.msrp) * p.qty * 100) / 100,
          };
        })
        .sort((a, b) => b.missed - a.missed)
    : [];
  const sinceRip = all.filter((p) => p.date >= data.openedOn);
  const floorMissed = sinceRip.length
    ? Math.floor(Math.min(...sinceRip.map((p) => p.value - cost)) / 100) * 100
    : 0;
  useReveal([data, range, metric]);

  const stats = [
    [money(cost), "Paid at MSRP"],
    [String(BOX_COUNT), "Boxes opened"],
    [last ? money(latest) : "...", "Sealed value today"],
    [last ? (latest / cost).toFixed(1) + "×" : "...", "Sealed vs paid"],
  ];

  return (
    <>
      <header className="nav">
        <a className="brand" href="#top">
          <Mark />
          RC Tracker
        </a>
        <nav className="links" aria-label="Sections">
          <a href="#went">Where it went</a>
          <a href="#history">Price history</a>
          <a href="#boxes">Box by box</a>
          <a href="#method">Method</a>
        </nav>
        <div className="nav-actions">
          <button
            className="pill ghost"
            onClick={() => {
              pick(null);
              setIntroKey((k) => k + 1);
              window.scrollTo({ top: 0 });
            }}
          >
            Replay
          </button>
          <a className="pill solid" href="#boxes">
            See every box
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero" key={introKey} aria-labelledby="title">
          <AshScene />
          <div className="hero-inner">
            <h1 id="title" className="enter" style={{ "--d": "200ms" }}>
              Thirteen boxes <em className="nowrap">opened.</em>
              <br />
              <span className="num">
                {last ? money(missedH) : "$0.00"}
              </span>{" "}
              <em className="nowrap">up in smoke.</em>
            </h1>
            <p className="lede enter" style={{ "--d": "450ms" }}>
              RC ripped {BOX_COUNT} Pokémon boxes on Aug 19, 2026. Sealed, the
              same boxes would sell for {last ? money(latest) : "..."} today.
            </p>
            <div className="ctas enter" style={{ "--d": "600ms" }}>
              <a className="pill solid lg" href="#boxes">
                See every box
              </a>
              <a className="pill ghost lg" href="#history">
                Price history
              </a>
            </div>
          </div>
          <dl className="stats enter" style={{ "--d": "800ms" }}>
            {stats.map(([value, label], i) => (
              <div key={label} className={i < 2 ? "left" : "right"}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {error && (
          <p className="notice" role="alert">
            {error}{" "}
            <button className="link" onClick={load}>
              Retry
            </button>
          </p>
        )}

        {last && (
          <>
            <Statement
              parts={[
                [`Sealed, the same ${BOX_COUNT} boxes would sell for`, false],
                [(latest / cost).toFixed(1) + "×", true],
                [
                  "what RC paid. Every snapshot since the rip, the gap stayed above",
                  false,
                ],
                [money(floorMissed).replace(".00", "") + ".", true],
              ]}
            />
            <DealtCards rows={latestRows} />
          </>
        )}

        <section id="history" className="section">
          <div className="section-head" data-reveal>
            <h2>
              Price <em>history</em>
            </h2>
            <p>
              What all {BOX_COUNT} boxes would sell for sealed, from TCGplayer
              market prices, starting the day the oldest one came out. Drag the
              chart to move through time.
            </p>
          </div>
          <div className="toolbar" data-reveal style={{ "--d": "120ms" }}>
            <div className="seg" role="group" aria-label="Chart metric">
              {[
                ["sealed", "Sealed value"],
                ["profit", "Missed profit"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  aria-pressed={metric === id}
                  onClick={() => setMetric(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Chart period">
              {RANGES.map(([name]) => (
                <button
                  key={name}
                  aria-pressed={range === name}
                  onClick={() => {
                    setRange(name);
                    pick(null);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className="pill ghost"
              onClick={play}
              disabled={chart.length < 2}
            >
              Play
            </button>
          </div>
          <dl className="readout" data-reveal style={{ "--d": "200ms" }}>
            <div>
              <dt>Sealed value</dt>
              <dd>{money(sealed)}</dd>
            </div>
            <div>
              <dt>Paid at MSRP</dt>
              <dd>{money(cost)}</dd>
            </div>
            <div>
              <dt>Missed gross profit</dt>
              <dd className="ember">{money(sealed - cost)}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{selected ? longDate(selected.date) : "..."}</dd>
            </div>
          </dl>
          {chart.length > 0 && (
            <div className="chart-wrap" data-reveal>
              <Timeline
                points={chart}
                selected={selected?.date}
                onSelect={pick}
                height={320}
                baseline={metric === "sealed" ? cost : null}
                label="Chart of value by date. Use the arrow keys to change the date."
              />
            </div>
          )}
          <div className="foot-row" data-reveal>
            <dl className="deltas">
              {deltas.map(([name, delta]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>
                    {delta === null
                      ? "No snapshot"
                      : (delta >= 0 ? "+" : "−") + money(Math.abs(delta))}
                  </dd>
                </div>
              ))}
            </dl>
            <button className="pill ghost" onClick={download} disabled={!last}>
              Download CSV
            </button>
          </div>
          {stale && (
            <p className="stale">
              Newest prices are over 48 hours old. The daily update may have
              stopped.
            </p>
          )}
        </section>

        <section id="boxes" className="section">
          <div className="section-head" data-reveal>
            <h2>
              The full <em>ledger</em>
            </h2>
            <p>
              Market price per box on{" "}
              {selected ? longDate(selected.date) : "..."}, sorted by missed
              profit.
            </p>
          </div>
          <div className="table-scroll" data-reveal style={{ "--d": "150ms" }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Boxes</th>
                  <th>Paid each</th>
                  <th>Now each</th>
                  <th>Multiple</th>
                  <th>Missed profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <a
                        className="product"
                        href={"https://www.tcgplayer.com/product/" + p.id}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ProductImg id={p.id} />
                        <span>
                          <strong>{p.set}</strong>
                          <small>{p.kind}</small>
                        </span>
                      </a>
                    </td>
                    <td>{p.qty}</td>
                    <td>{money(p.msrp)}</td>
                    <td>{p.now === null ? "Not out yet" : money(p.now)}</td>
                    <td>
                      {p.now === null ? "" : (p.now / p.msrp).toFixed(1) + "×"}
                    </td>
                    <td>
                      <span className="bar">
                        <span
                          className="bar-fill"
                          style={{ "--w": Math.max(p.missed, 0) / maxMissed }}
                        />
                        <b>{money(p.missed)}</b>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer id="method" className="footer">
        <p>
          Sealed value is the TCGplayer market price times the number of boxes.
          Missed gross profit is sealed value minus MSRP. Before a product came
          out, it counts at MSRP. Pulls, selling fees and shipping are not
          counted. MSRP is assumed from public sources, not from receipts, with
          zero Delaware sales tax. Prices via{" "}
          <a href="https://tcgcsv.com/">TCGCSV</a>.
        </p>
        <div className="wordmark" aria-hidden="true">
          RC <em>Tracker</em>
        </div>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
