import { useEffect, useState } from "react";
import { api, type KaliToolInfo } from "../api.js";
import { useJob } from "../hooks/useJob.js";
import { ModuleCard } from "./ModuleCard.js";
import { Terminal } from "./Terminal.js";

const HYDRA_SERVICES = ["ssh", "ftp", "http-get", "smb", "rdp"];

export function KaliToolsPanel({ scopeActive }: { scopeActive: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [tools, setTools] = useState<KaliToolInfo[]>([]);
  const [wordlists, setWordlists] = useState<string[]>([]);
  const job = useJob();

  const [authorized, setAuthorized] = useState(false);
  const [target, setTarget] = useState("");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  // Separate state per consumer — gobuster and john/hashcat pick wordlists
  // independently; sharing one selector meant choosing a cracking wordlist
  // silently changed what the next directory brute-force would use.
  const [dirWordlist, setDirWordlist] = useState("");
  const [crackWordlist, setCrackWordlist] = useState("");
  const [service, setService] = useState(HYDRA_SERVICES[0]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hashFile, setHashFile] = useState("");
  const [hashMode, setHashMode] = useState("0");

  useEffect(() => {
    api
      .kaliTools()
      .then((res) => {
        setEnabled(res.enabled);
        setTools(res.tools);
        setWordlists(res.wordlists);
        if (res.wordlists.length) {
          setDirWordlist(res.wordlists[0]);
          setCrackWordlist(res.wordlists[0]);
        }
      })
      .catch(() => setEnabled(false));
  }, []);

  const byId = (id: string) => tools.find((t) => t.id === id);

  function run(id: string, label: string, body: Record<string, string>) {
    job.run(() => api.runKaliTool(id, body), label);
  }

  if (!enabled) {
    return (
      <ModuleCard title="Kali Toolset" tag="SSH">
        <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-dim)" }}>
          Connect a Kali VM (see the Kali VM Uplink panel) to unlock theHarvester, amass, gobuster, sqlmap, Hydra,
          and the rest of this toolset.
        </p>
      </ModuleCard>
    );
  }

  const reconTools = tools.filter((t) => t.tier === "recon" && t.id !== "searchsploit" && t.id !== "msfsearch");
  const webTools = tools.filter((t) => t.tier === "web" && t.id !== "gobuster");
  const gobuster = byId("gobuster");
  const sqlmap = byId("sqlmap");
  const hydra = byId("hydra");
  const john = byId("john");
  const hashcat = byId("hashcat");

  const canRunTarget = authorized && !job.running && target.trim().length > 0;
  const canRunUrl = authorized && !job.running && url.trim().length > 0;
  const canRunQuery = authorized && !job.running && query.trim().length > 0;
  const canRunGated = canRunTarget && scopeActive; // vuln/high-risk tools additionally need engagement scope

  return (
    <ModuleCard title="Kali Toolset" tag="SSH">
      <label className="authorize">
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
        <span>
          I confirm I am authorized to test against these targets (own asset, signed engagement, or CTF scope) — same
          gate as the local Recon Module.
        </span>
      </label>

      <div className="row">
        <input type="text" placeholder="target hostname or IP…" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div className="row">
        {reconTools.map((t) => (
          <button key={t.id} disabled={!canRunTarget} onClick={() => run(t.id, t.label, { target: target.trim() })}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="row">
        <input type="text" placeholder="searchsploit / msf module search query…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button disabled={!canRunQuery} onClick={() => run("searchsploit", "searchsploit", { query: query.trim() })}>
          searchsploit
        </button>
        <button disabled={!canRunQuery} onClick={() => run("msfsearch", "Metasploit module search", { query: query.trim() })}>
          msf module search
        </button>
      </div>

      <div className="row">
        <input type="text" placeholder="target URL (http/https)…" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="row">
        {webTools.map((t) => (
          <button key={t.id} disabled={!canRunUrl} onClick={() => run(t.id, t.label, { url: url.trim() })}>
            {t.label}
          </button>
        ))}
        {gobuster && (
          <>
            <select value={dirWordlist} onChange={(e) => setDirWordlist(e.target.value)}>
              {wordlists.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <button disabled={!canRunUrl} onClick={() => run("gobuster", "gobuster dir", { url: url.trim(), wordlist: dirWordlist })}>
              gobuster dir
            </button>
          </>
        )}
      </div>

      {sqlmap && (
        <div className="row">
          <button
            disabled={!canRunUrl || !scopeActive}
            title={scopeActive ? undefined : "Confirm Engagement Scope first"}
            onClick={() => run("sqlmap", "sqlmap (detect only)", { url: url.trim() })}
          >
            sqlmap · detect only {scopeActive ? "" : "🔒"}
          </button>
        </div>
      )}

      {(hydra || john || hashcat) && (
        <>
          <div className="authorize" style={{ borderColor: "rgba(255,43,77,0.4)", color: "var(--red)" }}>
            <span>
              Credential-audit tools below require Engagement Scope confirmation and only ever test one credential
              pair at a time — no bundled wordlist spraying against live services.
            </span>
          </div>

          {hydra && (
            <div className="row">
              <select value={service} onChange={(e) => setService(e.target.value)}>
                {HYDRA_SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ minWidth: 100 }} />
              <input type="text" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ minWidth: 100 }} />
              <button
                disabled={!canRunGated || !username.trim() || !password.trim()}
                title={scopeActive ? undefined : "Confirm Engagement Scope first"}
                onClick={() =>
                  run("hydra", "Hydra credential test", { service, target: target.trim(), username: username.trim(), password: password.trim() })
                }
              >
                hydra test {scopeActive ? "" : "🔒"}
              </button>
            </div>
          )}

          {(john || hashcat) && (
            <div className="row">
              <input
                type="text"
                placeholder="hash filename already in KALI_WORK_DIR (e.g. dump.txt)…"
                value={hashFile}
                onChange={(e) => setHashFile(e.target.value)}
              />
              <select value={crackWordlist} onChange={(e) => setCrackWordlist(e.target.value)}>
                {wordlists.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              {john && (
                <button
                  disabled={!authorized || !scopeActive || job.running || !hashFile.trim()}
                  title={scopeActive ? undefined : "Confirm Engagement Scope first"}
                  onClick={() => run("john", "John the Ripper", { hashFile: hashFile.trim(), wordlist: crackWordlist })}
                >
                  john {scopeActive ? "" : "🔒"}
                </button>
              )}
              {hashcat && (
                <>
                  <input
                    type="text"
                    placeholder="hashcat mode #"
                    value={hashMode}
                    onChange={(e) => setHashMode(e.target.value)}
                    style={{ minWidth: 90, flex: "none" }}
                  />
                  <button
                    disabled={!authorized || !scopeActive || job.running || !hashFile.trim()}
                    title={scopeActive ? undefined : "Confirm Engagement Scope first"}
                    onClick={() => run("hashcat", "hashcat", { hashFile: hashFile.trim(), wordlist: crackWordlist, mode: hashMode.trim() })}
                  >
                    hashcat {scopeActive ? "" : "🔒"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      <Terminal text={job.output} status={job.status} />
    </ModuleCard>
  );
}
