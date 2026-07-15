import { useEffect, useState } from "react";
import { api, ApiError, type EngagementScope } from "../api.js";
import { ModuleCard } from "./ModuleCard.js";

const CONFIRM_PHRASE = "I AM AUTHORIZED";

function fmtRemaining(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

/** Gates vuln-scan and credential-audit tools behind an explicit, written scope confirmation. */
export function EngagementScopeGate({ onChange }: { onChange?: (active: boolean) => void }) {
  const [scope, setScope] = useState<EngagementScope | null>(null);
  const [description, setDescription] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await api.getScope();
      setScope(res.scope);
      onChange?.(res.scope !== null);
    } catch {
      // leave last known state
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.confirmScope(description, confirmText);
      setScope(res.scope);
      onChange?.(true);
      setDescription("");
      setConfirmText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    await api.clearScope();
    setScope(null);
    onChange?.(false);
  }

  return (
    <ModuleCard title="Engagement Scope" tag="GATE">
      {scope ? (
        <>
          <div className="voice-transcript">
            <span className="speaking">SCOPE ACTIVE</span> · {fmtRemaining(scope.expiresAt)}
          </div>
          <div className="voice-transcript idle-hint">{scope.description}</div>
          <div className="row">
            <button className="danger" onClick={clear}>
              clear scope
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-dim)" }}>
            Vuln-scan and credential-audit tools (nmap vuln scripts, sqlmap, Hydra, John, hashcat) stay locked until
            you confirm the engagement here. This mirrors real pentest scoping discipline — it's a deliberate extra
            step, not a formality.
          </p>
          <form onSubmit={confirm} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="describe the authorized engagement/scope (e.g. signed SOW ref, CTF name)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="row">
              <input
                type="text"
                placeholder={`type "${CONFIRM_PHRASE}" to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <button type="submit" disabled={busy || !description.trim() || confirmText !== CONFIRM_PHRASE}>
                confirm scope
              </button>
            </div>
          </form>
          {error && <div className="gate-error">{error}</div>}
        </>
      )}
    </ModuleCard>
  );
}
