import { useState } from "react";
import { api, ApiError } from "../api.js";
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

  async function runSubdomains() {
    setSubLoading(true);
    setSubError(null);
    setSubdomains(null);
    try {
      const res = await api.subdomains(target.trim());
      setSubdomains(res.subdomains);
    } catch (err) {
      setSubError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubLoading(false);
    }
  }

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
          N.E.M.E.S.I.S will not fire against a target without this box checked.
        </span>
      </label>

      <div className="row">
        {NMAP_PROFILES.map((p) => (
          <button key={p.id} disabled={!canRun} onClick={() => job.run(() => api.nmap(target.trim(), p.id))}>
            nmap · {p.label}
          </button>
        ))}
      </div>

      <div className="row">
        <button disabled={!canRun} onClick={() => job.run(() => api.whois(target.trim()))}>
          whois
        </button>
        <select value={recordType} onChange={(e) => setRecordType(e.target.value)} disabled={!authorized}>
          {DIG_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button disabled={!canRun} onClick={() => job.run(() => api.dig(target.trim(), recordType))}>
          dig
        </button>
        <button disabled={!authorized || subLoading || !target.trim()} onClick={runSubdomains}>
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
