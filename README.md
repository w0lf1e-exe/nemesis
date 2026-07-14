# N.E.M.E.S.I.S

**N**etwork **E**xploitation & **M**ulti-Stage **E**ngagement **S**ecurity **I**ntelligence **S**enter

A personal offensive-security & development console, built by **injexion.io**. Think JARVIS, pointed at recon, exploitation prep, and your own dev workflow — a single dark HUD that streams real tool output straight from your machine.

## What it is

- **A real backend** (Node/Express + TypeScript) that spawns actual security tools — `nmap`, `whois`, `dig` — and your local `git` repo, and streams their live output to the browser over Server-Sent Events.
- **A workshop-HUD frontend** (React + Vite + TypeScript) modeled on the Mark II/III Iron Man interface: an arc-reactor-style dial with a live clock and status readout, a rotating wireframe hologram at its center (WebGL/three.js), angular corner-bracketed panels, and drifting light motes across the backdrop — all in the injexion.io cyan/red palette.
- **A voice interface**: NEMESIS speaks job status aloud, and a push-to-talk mic accepts a small command grammar ("quick scan example.com", "git status", "find subdomains for target.com").
- **A genuine external-display mode**: open a mirrored, receive-only HUD in a second window — real second-monitor placement where the browser supports it (Window Management API), a plain draggable popup everywhere else — synced live via `BroadcastChannel` to whatever's running in the primary console.
- **Security-first by construction**: every offensive-tool route validates its target against a strict hostname/IP grammar, every process is launched via `spawn()` with an argument array (never a shell string, so there is no injection surface), scan flags come from a fixed server-side whitelist of profiles (never raw user flags), every API call requires a bearer key, and there's a client-side authorization checkbox that gates recon actions — including by voice.

## Architecture

```
nemesis/
├── server/     Express API — job engine, tool whitelist, SSE streaming
└── web/        React console — HUD, Recon/Dev/System modules
```

### Modules

| Module | What it does |
|---|---|
| **Recon** | `nmap` (ping sweep / quick / service-version / full-port profiles), `whois`, `dig`, and passive subdomain enumeration via crt.sh certificate-transparency logs |
| **Dev** | `git status` / `log` / `diff --stat` / `branch` / `remote` / `show-ref` against a configured local repo |
| **System** | Live host telemetry — uptime, memory, CPU, platform |

## The interface

- **HUD core**: the centerpiece dial (`web/src/components/HudCore.tsx`) renders concentric tick/dashed rings in CSS/SVG around a `three.js` wireframe hologram (`web/src/three/Hologram.tsx`). The hologram shape itself reacts to what's running — an icosahedron core at idle, a wireframe globe while a scan is active, a torus knot while a git job runs. three.js is lazy-loaded on first mount so it never blocks the initial page load.
- **Voice**: `web/src/voice/speech.ts` wraps the Web Speech API for output (toggle in the voice dock), `web/src/voice/parseCommand.ts` is the small closed-vocabulary grammar for push-to-talk input, and `web/src/voice/commandBus.ts` dispatches parsed commands to whichever panel owns that action — so voice and buttons share one code path.
- **External display**: click **⧉ external display** in the header. `web/src/sync/externalWindow.ts` tries the [Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API) to place the new window on a secondary monitor and size it to fill it; if that permission isn't granted (or the browser doesn't support it), it falls back to a normal popup you can drag over yourself and click "fullscreen" on. Once open, `?display=external` in the URL switches to `web/src/ExternalDisplay.tsx` — a receive-only mirror that never runs actions itself, fed live by `web/src/sync/bus.ts` (`BroadcastChannel`, same-origin/same-browser only, so it adds no new network exposure). Panels broadcast their own state (`ReconPanel`, `DevPanel`, `SystemPanel`, `VoiceDock`); the external view — and the primary dashboard's own hologram — just subscribe.

## Getting started

```bash
npm run install:all      # installs server/ and web/ deps

cp server/.env.example server/.env
# generate a real key:
openssl rand -hex 32
# paste it into server/.env as NEMESIS_API_KEY

cp web/.env.example web/.env.local   # defaults to http://localhost:4317, adjust if needed

npm run dev               # runs server (:4317) and web (:5173) together
```

Open `http://localhost:5173`, paste your `NEMESIS_API_KEY` into the access-control gate, and you're in.

If you skip setting `NEMESIS_API_KEY`, the server generates a throwaway key each restart and prints it to the console log — fine for a quick look, but set a real one in `.env` for anything persistent.

### Requirements for full functionality

`nmap`, `whois`, and `dig` must be installed on the machine running `server/`. If a tool is missing, the console reports it cleanly instead of crashing (e.g. `"nmap" is not installed on this host`). `git` ships with the OS toolchain assumed here.

```bash
# Debian/Ubuntu
sudo apt install nmap whois dnsutils
```

Voice output (speech synthesis) works in any modern browser. Voice *input* (push-to-talk) needs the Web Speech API's `SpeechRecognition`, which today means Chrome/Edge/Chromium — the mic button shows disabled with an explanatory tooltip elsewhere. Second-monitor auto-placement for the external display needs the Window Management API (Chromium, and only once you've granted the permission); it degrades to a plain draggable popup everywhere else.

## Security notes

This tool executes real network scans and lookups against whatever target you give it. It is built for **your own infrastructure, authorized penetration tests, and CTF scopes** — not for scanning systems you don't have permission to touch. The UI's authorization checkbox is a reminder, not a substitute for having an actual signed engagement or ownership of the target.

Other things worth knowing before you expose this beyond `localhost`:

- The API key is a single shared secret (bearer token) — treat `server/.env` like any other credential.
- `WEB_ORIGIN`/CORS is locked to one origin; widen it deliberately if you need to.
- Jobs are capped by `JOB_TIMEOUT_MS` (default 5 min) and `JOB_MAX_OUTPUT_BYTES` (default ~2 MB) to bound resource use.
- There's a lightweight per-IP rate limiter on `/api/*` (20 requests/minute, refilling).
- If you put this on a network you don't fully trust, put it behind a reverse proxy with TLS — bearer tokens over plain HTTP are only as safe as the network they cross.

## Extending it

- **More recon tools**: add the binary to the `ALLOWED_TOOLS` whitelist in `server/src/lib/jobs.ts`, add a validated route in `server/src/routes/`, wire a button in `web/src/components/ReconPanel.tsx`.
- **A real conversational assistant**: the module/job pattern here is intentionally generic — plugging in an LLM (e.g. the Claude API) as a "brain" that calls these same job endpoints as tools is a natural next step, deliberately left out of this build so the execution layer stays auditable on its own.

---

*N.E.M.E.S.I.S · injexion.io · for authorized security testing and internal development use only.*
