# Venezuela Earthquake Companion Desk — EMSR884

> **This is a draft and an idea. Take it, modify it, ship it. Every minute matters.**
> *歡迎取用修改，搶救人命，讓我們人類再次偉大而可貴。*

---

## Acknowledgement

This project was inspired by and built upon the encouragement of **[Yin-renlong](https://github.com/yin-renlong)**, whose interactive damage-assessment map for the Venezuela earthquake is genuinely impressive work — clear, fast, and built for the people who need it most.

His dashboard ([venezuela-earthquake-copernicus-data-dashboard-2026](https://yin-renlong.github.io/venezuela-earthquake-copernicus-data-dashboard-2026/?aoi=12)) made me wonder: what if there were a companion tool on the *field* side — something a rescue team could carry offline, without relying on a server or a stable connection? That question is what this repo tries to answer, however roughly.

Thank you, Yin-renlong. The map is excellent. This is just one more layer trying to be useful.

---

## What This Is

**Venezuela Earthquake Companion Desk** is an offline-first, single-HTML-file tool for field teams responding to [EMSR884](https://rapidmapping.emergency.copernicus.eu/EMSR884) — the Copernicus Emergency Management Service activation following the **7.5 Mw earthquake near Caracas on 24 June 2026** (100+ fatalities, widespread structural damage).

It runs entirely in the browser with no server dependency after the initial cache sync. Every module assumes the team has pre-downloaded the necessary data before leaving the depot.

---

## Modules

| Module | What it does |
|--------|-------------|
| **A — Codec** | Encodes building assessment records into 32-character fixed-width strings for transmission over low-bandwidth radio. Decode recovers signed lat/lon, status, and height — no coordinate loss. |
| **A — AFSK Modem** | Bell-202-style audio FSK modem. TX generates a waveform playable through any speaker; RX decodes from microphone input. Offline TX→RX round-trip test built in. |
| **B — Digital Twin / Shadow** | Calculates real solar position (NOAA equations) from lat/lon/date/hour and renders a top-down shadow for each assessed building. Not decorative — shadow geometry matters for search grids. |
| **C — Tactical Routing** | A* pathfinding over a terrain graph with separate cost tables for infantry vs. armored vehicles. Blocked zones cost ×100/×10; damaged zones cost ×50/×1. Runs in a Web Worker. |
| **D — Satellite Revisit** | SGP4 orbital propagator against a bundled Sentinel-1A TLE snapshot. Shows real pass times (rise / peak elevation / set) over the AOI. No fake countdown. |
| **D — Anomaly Audit** | Operator-entered anomaly flags only. No social media scrapers, no Telegram API. A human fills the form; the flag travels with the building record. |
| **i18n** | Five languages: English, Spanish, French, Italian, Chinese. All UI strings bound via `data-i18n-key`; switch instantly at runtime. |

---

## Architecture Constraints (non-negotiable)

Three decisions made early that will not be revisited:

1. **Offline = pre-synced cache, not zero-network.** Every external dependency (road graphs, TLE snapshots, building heights) is assumed to be downloaded before departure. No `fetch()` to external APIs at runtime.

2. **No social media scraping.** Crowd-sourced anomaly data comes from the in-app operator form — never from Telegram, X/Twitter, or any bot API.

3. **Missing data is shown honestly.** If a module lacks real data, it says so explicitly (e.g., `⚠️ Orbital data not loaded`). It never substitutes a plausible-looking constant and presents it as a computed result. Code that lies is more dangerous than code that admits uncertainty.

---

## Running Locally

```bash
# Requires Python 3 or Node.js
python -m http.server 8080
# then open http://localhost:8080
```

ES modules require HTTP — opening `index.html` directly as a `file://` URL will fail due to CORS restrictions.

---

## Field-Critical Modules

`modules/routing/` and `modules/codec/` are tagged **field-critical**: wrong output from either could send a rescue team to the wrong location or garble a coordinate in transit. Both have passed independent adversarial verification (`field-critical-verifier` protocol) with behavioural test suites — not just "runs without throwing."

---

## Refreshing the TLE Snapshot

The Sentinel-1A TLE bundled in `modules/orbit/data/tle-snapshot.txt` is accurate for approximately 7 days from its fetch date. To refresh:

```bash
curl "https://tle.ivanstanojevic.me/api/tle/39634" \
  | jq -r '"SENTINEL-1A\n" + .line1 + "\n" + .line2' \
  > modules/orbit/data/tle-snapshot.txt
```

Then update the `# Fetched:` and `# Valid for:` header comments in that file.

---

## Status

This is a **draft**. It is not certified, not audited, and not a substitute for official Copernicus products or trained emergency management systems. It is an idea, written in good faith, offered freely.

If you are a developer, GIS specialist, or emergency responder and you see something that could be better — please make it better. Fork it. Fix it. Ship it to someone who needs it.

---

## License

Public domain / [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Do whatever you need to do.
