# Fills public/data/history.json with past prices from TCGCSV's daily archives.
# One point a week from the oldest product's release, plus each release day.
# Needs py7zr (pip install py7zr) and curl.
import datetime, json, pathlib, subprocess, time
import py7zr

# product id: (TCGplayer group, first day it was out)
products = {
    622770: (23821, "2025-03-09"),  # Prismatic Evolutions SPC
    630687: (24325, "2025-07-18"),  # Black Bolt ETB
    630688: (24326, "2025-07-18"),  # White Flare ETB
    644282: (24380, "2025-09-26"),  # Mega Evolution ETB, Lucario
    648415: (24380, "2025-09-26"),  # Mega Evolution ETB, Gardevoir
    654135: (24448, "2025-11-14"),  # Phantasmal Flames ETB
    668497: (24541, "2026-01-30"),  # Ascended Heroes ETB
    672404: (24587, "2026-03-27"),  # Perfect Order ETB
    672394: (24587, "2026-03-27"),  # Perfect Order booster box
}
cache = pathlib.Path(".price-cache")
cache.mkdir(exist_ok=True)
output = pathlib.Path("public/data/history.json")
data = json.loads(output.read_text())
history = {x["date"]: x for x in data["history"]}

start = datetime.date.fromisoformat(min(r for _, r in products.values()))
end = datetime.date.fromisoformat(data["openedOn"])
days = {(start + datetime.timedelta(days=n)).isoformat() for n in range(0, (end - start).days, 7)}
days.update(r for _, r in products.values())

for day in sorted(days):
    if day in history:
        continue
    url = f"https://tcgcsv.com/archive/tcgplayer/prices-{day}.ppmd.7z"
    archive = cache / (day + ".7z")
    try:
        if not archive.exists():
            time.sleep(6)  # TCGCSV allows one request every 5 seconds
            if subprocess.run(["curl", "-sfA", "RC-Tracker/1.0", "-o", archive, url]).returncode:
                archive.unlink(missing_ok=True)
                raise RuntimeError("download failed")
        out = {pid: g for pid, (g, r) in products.items() if r <= day}
        paths = [f"{day}/3/{g}/prices" for g in set(out.values())]
        with py7zr.SevenZipFile(archive) as a:
            a.extract(path=cache / "extracted", targets=paths)
        prices = {}
        for pid, g in out.items():
            rows = json.loads((cache / "extracted" / f"{day}/3/{g}/prices").read_text())["results"]
            row = next(x for x in rows if x["productId"] == pid and x["subTypeName"] == "Normal")
            assert row["marketPrice"], f"no price for {pid}"
            prices[str(pid)] = row["marketPrice"]
        history[day] = {"date": day, "prices": prices, "sourceUrl": url, "historical": True}
        print("Saved", day, flush=True)
    except Exception as e:
        print("Skipped", day, e, flush=True)

data["startedOn"] = start.isoformat()
data["history"] = sorted(history.values(), key=lambda x: x["date"])
output.write_text(json.dumps(data, indent=2) + "\n")
