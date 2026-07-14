import { useEffect, useState } from "react";
import { api, ApiError } from "../api.js";
import { onCommand } from "../voice/commandBus.js";
import { speak } from "../voice/speech.js";
import { useJob } from "../hooks/useJob.js";
import { ModuleCard } from "./ModuleCard.js";
import { Terminal } from "./Terminal.js";

const NMAP_PROFILES = [
  { id: "ping", label: "ping sweep" },
  { id: "quick", label: "quick scan" },
  { id: "service", label: "service/version" },
  { id: "full", label: "full port range" },
];

const DIG_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "ANY"];

export function ReconPanel() {
  const [target, setTarget] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [authorized, setAuthorized] = useState(false);
  const job = useJob();
  const [subError, setSubError] = useState<string | null>(null);
  const [subdomains, setSubdomains] = useState<string[] | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const canRun = authorized && target.trim().length > 0 && !job.running;

  async function runSubdomains(explicitTarget?: string) {
    const t = (explicitTarget ?? target).trim();
    if (!t) return;
    setSubLoading(true);
    setSubError(null);
    setSubdomains(null);
    try {
      const res = await api.subdomains(t);
      setSubdomains(res.subdomains);
      speak(`Found ${res.count} host${res.count === 1 ? "" : "s"} for ${t}.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : String(err);
      setSubError(message);
      speak("Subdomain search failed.");
    } finally {
      setSubLoading(false);
    }
  }

  // Wire voice commands to the same actions the buttons trigger. Scans still
  // require the authorization checkbox — voice cannot bypass that gate.
  useEffect(() => {
    const unsubscribers = [
      onCommand("recon.setTarget", ({ target: t }) => setTarget(t)),
      onCommand("recon.nmap", ({ target: t, profile }) => {
        setTarget(t);
        if (!authorized) {
          speak("Authorization checkbox isn't checked. Confirm authorization before I can scan.");
          return;
        }
        const label = NMAP_PROFILES.find((p) => p.id === profile)?.label ?? profile;
        speak(`Copy. Running ${label} scan on ${t}.`);
        job.run(() => api.nmap(t, profile), `${label} scan`);
      }),
      onCommand("recon.whois", ({ target: t }) => {
        setTarget(t);
        if (!authorized) {
          speak("Authorization checkbox isn't checked. Confirm authorization before I can run that.");
          return;
        }
        speak(`Pulling whois records for ${t}.`);
        job.run(() => api.whois(t), "Whois lookup");
      }),
      onCommand("recon.dig", ({ target: t, recordType: rt }) => {
        setTarget(t);
        setRecordType(rt);
        if (!authorized) {
          speak("Authorization checkbox isn't checked. Confirm authorization before I can run that.");
          return;
        }
        speak(`Resolving ${rt} records for ${t}.`);
        job.run(() => api.dig(t, rt), "DNS lookup");
      }),
      onCommand("recon.subdomains", ({ target: t }) => {
        setTarget(t);
        if (!authorized) {
          speak("Authorization checkbox isn't checked. Confirm authorization before I can run that.");
          return;
        }
        speak(`Searching certificate logs for ${t}.`);
        runSubdomains(t);
      }),
    ];
    return () => unsubscribers.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  return (
    <ModuleCard title="Recon Module" tag="OFFENSIVE">
      <div className="row">
        <input
          type="text"
          placeholder="target hostname or IP…"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>

      <label className="authorize">
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
        <span>
          I confirm I am authorized to test this target (own asset, signed engagement, or CTF scope).
          N.E.M.E.S.I.S will not fire against a target without this box checked — including by voice.
        </span>
      </label>

      <div className="row">
        {NMAP_PROFILES.map((p) => (
          <button
            key={p.id}
            disabled={!canRun}
            onClick={() => job.run(() => api.nmap(target.trim(), p.id), `${p.label} scan`)}
          >
            nmap · {p.label}
          </button>
        ))}
      </div>

      <div className="row">
        <button disabled={!canRun} onClick={() => job.run(() => api.whois(target.trim()), "Whois lookup")}>
          whois
        </button>
        <select value={recordType} onChange={(e) => setRecordType(e.target.value)} disabled={!authorized}>
          {DIG_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          disabled={!canRun}
          onClick={() => job.run(() => api.dig(target.trim(), recordType), "DNS lookup")}
        >
          dig
        </button>
        <button disabled={!authorized || subLoading || !target.trim()} onClick={() => runSubdomains()}>
          {subLoading ? "querying crt.sh…" : "subdomain enum (crt.sh)"}
        </button>
      </div>

      <Terminal text={job.output} status={job.status} />

      {subError && <div className="gate-error">{subError}</div>}
      {subdomains && (
        <div className="subdomain-list">
          <span>
            found <b>{subdomains.length}</b> unique host(s) in certificate-transparency logs:
          </span>
          {subdomains.map((s) => (
            <span key={s}>
              <b>{s}</b>
            </span>
          ))}
        </div>
      )}
    </ModuleCard>
  );
}
