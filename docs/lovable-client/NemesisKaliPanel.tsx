// Drop-in panel: connects to your NEMESIS backend and runs the Kali VM
// toolset from your Lovable app. Plain Tailwind classes only — no UI
// library dependency, so it works whether or not your project has shadcn.
//
// Copy into your Lovable project as e.g. src/components/NemesisKaliPanel.tsx,
// then render <NemesisKaliPanel /> from any page.

import { useEffect, useState } from "react";
import {
  ApiError,
  getApiKey,
  getBaseUrl,
  nemesisApi,
  setApiKey,
  setBaseUrl,
  type KaliStatus,
  type KaliToolInfo,
} from "../lib/nemesisApi";
import { useNemesisJob } from "../hooks/useNemesisJob";

// Which body fields each tool needs, per docs/API_REFERENCE.md.
const TOOL_FIELDS: Record<string, { name: string; label: string; placeholder?: string }[]> = {
  theharvester: [{ name: "target", label: "Target domain" }],
  amass: [{ name: "target", label: "Target domain" }],
  dnsrecon: [{ name: "target", label: "Target domain" }],
  sublist3r: [{ name: "target", label: "Target domain" }],
  searchsploit: [{ name: "query", label: "Search query" }],
  msfsearch: [{ name: "query", label: "Search query" }],
  nikto: [{ name: "url", label: "Target URL" }],
  whatweb: [{ name: "url", label: "Target URL" }],
  wpscan: [{ name: "url", label: "Target URL" }],
  gobuster: [
    { name: "url", label: "Target URL" },
    { name: "wordlist", label: "Wordlist id (see /api/kali-tools)" },
  ],
  sqlmap: [{ name: "url", label: "Target URL" }],
  hydra: [
    { name: "service", label: "Service (ssh|ftp|http-get|smb|rdp)" },
    { name: "target", label: "Target host" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password" },
  ],
  john: [
    { name: "hashFile", label: "Hash filename (in KALI_WORK_DIR)" },
    { name: "wordlist", label: "Wordlist id" },
  ],
  hashcat: [
    { name: "hashFile", label: "Hash filename (in KALI_WORK_DIR)" },
    { name: "wordlist", label: "Wordlist id" },
    { name: "mode", label: "Hashcat mode (numeric)" },
  ],
};

export function NemesisKaliPanel() {
  const [baseUrl, setBaseUrlInput] = useState(getBaseUrl());
  const [apiKey, setApiKeyInput] = useState(getApiKey());
  const [kaliStatus, setKaliStatus] = useState<KaliStatus | null>(null);
  const [tools, setTools] = useState<KaliToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [scopeDesc, setScopeDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const job = useNemesisJob();

  function saveConnection() {
    setBaseUrl(baseUrl);
    setApiKey(apiKey);
    refresh();
  }

  async function refresh() {
    setError(null);
    try {
      const status = await nemesisApi.kaliStatus();
      setKaliStatus(status);
      const { tools } = await nemesisApi.kaliTools();
      setTools(tools);
      if (tools.length && !selectedTool) setSelectedTool(tools[0].id);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    }
  }

  useEffect(() => {
    if (getApiKey()) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkKaliConnection() {
    setError(null);
    try {
      const { job: j } = await nemesisApi.kaliCheck();
      job.attach(j);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    }
  }

  async function confirmScope() {
    setError(null);
    try {
      await nemesisApi.confirmScope(scopeDesc, "I AM AUTHORIZED");
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    }
  }

  async function runTool() {
    setError(null);
    try {
      const { job: j } = await nemesisApi.runKaliTool(selectedTool, fields);
      job.attach(j);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e));
    }
  }

  const selectedToolInfo = tools.find((t) => t.id === selectedTool);
  const needsScope = selectedToolInfo?.tier === "vuln" || selectedToolInfo?.tier === "high-risk";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 text-sm">
      <section className="space-y-2">
        <h2 className="font-semibold text-base">NEMESIS backend connection</h2>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Backend URL (e.g. http://localhost:4317)"
          value={baseUrl}
          onChange={(e) => setBaseUrlInput(e.target.value)}
        />
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="API key (NEMESIS_API_KEY)"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKeyInput(e.target.value)}
        />
        <button className="border rounded px-3 py-1" onClick={saveConnection}>
          Save & connect
        </button>
        {kaliStatus && (
          <p className="text-xs text-gray-500">
            Kali VM: {kaliStatus.enabled ? `${kaliStatus.user}@${kaliStatus.host}:${kaliStatus.port}` : "not configured"}
          </p>
        )}
        <button className="border rounded px-3 py-1" onClick={checkKaliConnection} disabled={!kaliStatus?.enabled}>
          Check connection & tool inventory
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-base">Run a Kali tool</h2>
        <select
          className="w-full border rounded px-2 py-1"
          value={selectedTool}
          onChange={(e) => {
            setSelectedTool(e.target.value);
            setFields({});
          }}
        >
          {tools.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({t.tier})
            </option>
          ))}
        </select>

        {(TOOL_FIELDS[selectedTool] ?? []).map((f) => (
          <input
            key={f.name}
            className="w-full border rounded px-2 py-1"
            placeholder={f.placeholder ?? f.label}
            value={fields[f.name] ?? ""}
            onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
          />
        ))}

        {needsScope && (
          <div className="border rounded p-2 space-y-1 bg-yellow-50">
            <p className="text-xs">
              This tool tier requires Engagement Scope confirmation before it will run.
            </p>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Describe what you're authorized to test"
              value={scopeDesc}
              onChange={(e) => setScopeDesc(e.target.value)}
            />
            <button className="border rounded px-3 py-1" onClick={confirmScope}>
              Confirm scope (I AM AUTHORIZED)
            </button>
          </div>
        )}

        <button className="border rounded px-3 py-1 bg-black text-white" onClick={runTool} disabled={!selectedTool}>
          Run
        </button>
      </section>

      {error && <p className="text-red-600">{error}</p>}

      <section>
        <h2 className="font-semibold text-base">
          Output {job.running && "(running…)"} {job.status !== "idle" && `— ${job.status}`}
        </h2>
        <pre className="bg-black text-green-400 p-3 rounded h-64 overflow-auto whitespace-pre-wrap">{job.output}</pre>
      </section>
    </div>
  );
}
