# N.E.M.E.S.I.S API Reference

For a frontend other than this repo's own console (e.g. the Lovable-built
`nemesis-kali-front`) to drive the NEMESIS backend, it needs three things:
the auth scheme, the async job pattern every tool endpoint shares, and the
endpoint list below. This document covers all three. A machine-readable copy
of the endpoint list is in [`openapi.json`](./openapi.json).

## Base URL

The server listens on `http://localhost:4317` by default (`PORT` in
`server/.env`). It is designed to run on **your own machine**, not as a
public internet service — see "Reaching it from a deployed frontend" below
for what that does and doesn't allow.

## Auth

Every route except `GET /api/health` requires a bearer token:

```
Authorization: Bearer <NEMESIS_API_KEY>
```

The key lives in `server/.env` (`NEMESIS_API_KEY`) — generate one with
`openssl rand -hex 32`, or run `npm run setup` from the repo root, which
generates one for you and prints it. A request with a missing or wrong key
gets `401 {"error": "unauthorized"}`.

**Exception — job streaming:** `EventSource` (used for `GET
/api/jobs/:id/stream`) cannot set custom headers, so that one endpoint alone
also accepts the key as a query parameter: `?token=<key>`. Every other
endpoint must use the `Authorization` header.

## CORS

Set `WEB_ORIGIN` in `server/.env` to a comma-separated list of every origin
that's allowed to call this API — e.g.
`WEB_ORIGIN=http://localhost:5173,http://localhost:8080` for this repo's own
console plus a Lovable dev server. A request from an origin not in that list
is rejected by the browser before your frontend code ever sees a response.

### Reaching it from a deployed frontend

If `nemesis-kali-front` is deployed publicly (e.g.
`https://your-project.lovable.app`) and you want *that* page — opened in
your own browser, on the same machine running this backend — to talk to your
local NEMESIS server, add that deployed origin to `WEB_ORIGIN` too. This
works because browsers treat `http://localhost` as a "potentially
trustworthy" target even when the calling page is `https://`, and this
server sends the `Access-Control-Allow-Private-Network` header Chrome's
Private Network Access spec requires for a public-origin page to reach a
loopback server.

What this does **not** do: let anyone else on the internet reach your
backend. Nothing here makes the server listen on anything but your own
machine — only your own browser, visiting the deployed page, can reach the
`localhost` server sitting next to it. If you instead want the backend
reachable by other people over the internet, that's a materially different
(and materially more sensitive, since this executes real commands) setup —
ask before assuming that's what "hooked up" means.

## The async job pattern

Every tool-execution endpoint (nmap, whois, dig, git, and every Kali tool)
follows the same shape, because the underlying process can run for seconds
to minutes and streams output as it goes:

1. `POST` the tool's endpoint with its parameters. On success you get back
   `202 { "job": JobMeta }` immediately — the process has *started*, not
   finished.
2. Either:
   - Open an `EventSource` on `GET /api/jobs/:id/stream?token=<key>` to
     receive output live (`data` events with output chunks, one `end` event
     with the final `{status, exitCode}` when it's done), or
   - Poll `GET /api/jobs/:id` (normal bearer-header auth) for the current
     `JobMeta`, which includes `status` and accumulates the same output
     server-side if you'd rather pull than stream.

```ts
interface JobMeta {
  id: string;
  tool: string;        // the binary that was run, e.g. "nmap"
  args: string[];       // the exact argv it was run with
  executor: "local" | "kali";
  status: "running" | "done" | "error" | "killed";
  exitCode: number | null;
  startedAt: number;    // epoch ms
  endedAt: number | null;
}
```

`status` becomes `"error"` if the tool binary isn't installed (message
explains which one), `"killed"` if it hit `JOB_TIMEOUT_MS` (default 5 min),
or `"done"` on normal exit (check `exitCode` for success/failure of the
tool itself).

## Error shape

Non-2xx responses are always `{ "error": string, ...extra }`:

| Status | Meaning |
|---|---|
| 400 | Bad input — validation failed, or the Kali VM isn't configured |
| 401 | Missing/wrong bearer token |
| 403 | Engagement Scope isn't confirmed (vuln-scan / credential-audit tools only) |
| 404 | Unknown job id, or unknown Kali tool id |
| 429 | Rate limited (20 requests/minute per IP, refilling) |
| 500 | Unexpected server error |

## Endpoints

### System

**`GET /api/system/status`** — host telemetry (hostname, platform, cpu count,
memory, uptime). Used for the HUD's "System Telemetry" panel and as a
lightweight auth-check ping.

### Recon (local or Kali VM)

All three accept an optional `"executor": "local" | "kali"` (default
`"local"`); `"kali"` requires a configured Kali VM (see below).

**`POST /api/recon/nmap`**
```json
{ "target": "example.com", "profile": "quick", "executor": "local" }
```
`profile` ∈ `ping | quick | service | full | vuln` (fixed flag sets server-side
— never raw nmap flags). `vuln` additionally requires Engagement Scope
confirmed (403 otherwise).

**`POST /api/recon/whois`** — `{ "target": "example.com", "executor": "local" }`

**`POST /api/recon/dig`** — `{ "target": "example.com", "recordType": "A", "executor": "local" }`
(`recordType` ∈ `A AAAA MX TXT NS CNAME SOA ANY`, defaults to `A`)

**`POST /api/recon/subdomains`** — `{ "target": "example.com" }`. Not a job —
returns synchronously: `{ "target": string, "count": number, "subdomains": string[] }`,
sourced from crt.sh certificate-transparency logs.

### Dev

**`POST /api/dev/git`** — `{ "subcommand": "status" }`, `subcommand` ∈
`status | log | diff | branch | remote | show-ref`. Runs against
`DEV_REPO_PATH` (server config, not client-supplied). Response adds
`repoPath` alongside `job`.

### Kali VM connectivity

**`GET /api/kali/status`** — `{ enabled, host, port, user, workDir }`.
`enabled` reflects whether `KALI_SSH_HOST` is set; `host` is `null` when
disabled.

**`POST /api/kali/check`** — no body. Starts a job that SSHes into the
configured Kali VM and reports which registry tools are installed there
(`toolname   installed` / `toolname   missing`, one per line).

### Kali tool registry

**`GET /api/kali-tools`** — `{ enabled, wordlists: string[], tools: [{id, label, tier, binary}] }`.
`tier` ∈ `recon | web | vuln | high-risk`. Use this to build tool
lists/forms dynamically instead of hardcoding the set.

**`POST /api/kali-tools/:id/run`** — body shape depends on `:id`:

| id | tier | body |
|---|---|---|
| `theharvester`, `amass`, `dnsrecon`, `sublist3r` | recon | `{ target }` |
| `searchsploit`, `msfsearch` | recon | `{ query }` |
| `nikto`, `whatweb`, `wpscan` | web | `{ url }` |
| `gobuster` | web | `{ url, wordlist }` |
| `sqlmap` | vuln | `{ url }` — hardcoded to detection-only flags, never `--dump`/`--os-shell` |
| `hydra` | high-risk | `{ service, target, username, password }` — `service` ∈ `ssh ftp http-get smb rdp`; tests exactly one credential pair |
| `john` | high-risk | `{ hashFile, wordlist }` — `hashFile` is a filename already sitting in `KALI_WORK_DIR` |
| `hashcat` | high-risk | `{ hashFile, wordlist, mode }` — `mode` is hashcat's numeric hash-type id |

`wordlist` (where used) ∈ whatever `GET /api/kali-tools` returns in
`wordlists` (currently `dirb-common | dirb-big | seclists-common | rockyou`)
— never an arbitrary path.

`vuln` and `high-risk` tier tools require Engagement Scope confirmed (403
otherwise, see below).

### Engagement Scope

Gates the `vuln` nmap profile and the `vuln`/`high-risk` Kali tools behind an
explicit confirmation, separate from the bearer key — mirrors real pentest
engagement scoping.

**`GET /api/scope`** — `{ scope: { description, confirmedAt, expiresAt } | null }`

**`POST /api/scope/confirm`**
```json
{ "description": "Authorized pentest of example.com per SOW #123", "confirmText": "I AM AUTHORIZED" }
```
`description` must be ≥10 characters; `confirmText` must be exactly `"I AM
AUTHORIZED"`. Returns the new scope, active for `SCOPE_DURATION_MS` (default
4 hours).

**`POST /api/scope/clear`** — no body. `{ "ok": true }`.

### Jobs

**`GET /api/jobs/:id`** — `{ job: JobMeta }`, `404` if unknown.

**`GET /api/jobs/:id/stream?token=<key>`** — Server-Sent Events. `data`
events carry a JSON-encoded string chunk; the terminal `end` event carries
`{ status, exitCode }`.

## Example: run a scan and stream it

```js
const res = await fetch("http://localhost:4317/api/recon/nmap", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ target: "example.com", profile: "quick" }),
});
const { job } = await res.json();

const stream = new EventSource(
  `http://localhost:4317/api/jobs/${job.id}/stream?token=${encodeURIComponent(apiKey)}`,
);
stream.addEventListener("data", (e) => console.log(JSON.parse(e.data)));
stream.addEventListener("end", (e) => {
  console.log("finished:", JSON.parse(e.data));
  stream.close();
});
```
