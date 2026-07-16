# Dropping NEMESIS into your Lovable app

Three files, no new dependencies (plain `fetch`/`EventSource`, works in any
React + TypeScript Lovable project):

| File | Where it goes in your Lovable project |
|---|---|
| `nemesisApi.ts` | `src/lib/nemesisApi.ts` |
| `useNemesisJob.ts` | `src/hooks/useNemesisJob.ts` |
| `NemesisKaliPanel.tsx` | `src/components/NemesisKaliPanel.tsx` |

Drag/paste all three in, then render the panel from any page:

```tsx
import { NemesisKaliPanel } from "@/components/NemesisKaliPanel";

export default function KaliPage() {
  return <NemesisKaliPanel />;
}
```

(If your project's import alias isn't `@/`, use a relative path instead —
adjust the two `import` lines at the top of `NemesisKaliPanel.tsx` and
`useNemesisJob.ts` to match wherever you put `lib/` and `hooks/`.)

## Before it'll connect

1. **Run the NEMESIS backend** on the machine that can reach your Kali VM:
   ```bash
   cd server && npm install && npm run dev
   ```
   It listens on `http://localhost:4317` by default.

2. **Configure Kali VM access** in `server/.env` (SSH, key-based only — see
   the main [README](../../README.md#kali-linux-integration) for the
   `ssh-keygen`/`ssh-copy-id` steps against your VMware VM).

3. **Allow your Lovable origin through CORS** — add it to `WEB_ORIGIN` in
   `server/.env`, comma-separated with anything else already there, e.g.:
   ```
   WEB_ORIGIN=http://localhost:5173,http://localhost:8080,https://your-project.lovable.app
   ```
   Use whatever origin your Lovable preview/dev/deployed page actually runs
   on — check the browser address bar.

4. **In the running panel**, paste the backend URL (`http://localhost:4317`
   unless you changed `PORT`) and the `NEMESIS_API_KEY` from `server/.env`,
   click **Save & connect**, then **Check connection & tool inventory** to
   confirm SSH into the Kali VM works.

That's it — the panel lists every registered Kali tool, builds the right
form fields per tool, runs it, and streams live output. `vuln`/`high-risk`
tools (sqlmap, hydra, john, hashcat, nmap vuln scripts) will prompt for the
Engagement Scope confirmation first, same as the console in this repo.

## Note on where this runs

A Lovable page — whether opened from its dev server or its deployed
`https://*.lovable.app` URL — can only reach the NEMESIS backend if it's
opened in a browser **on the same machine** running that backend (it's a
`localhost` service, not exposed to the internet). That's deliberate: this
executes real commands against a real Kali VM, so it stays reachable only
from your own machine unless you explicitly decide to expose it further —
which is a materially different, more sensitive setup worth discussing
first rather than doing by default.
