import { useState } from "react";
import { api, setApiKey } from "../api.js";
import { ModuleCard } from "./ModuleCard.js";

export function AuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    setApiKey(key.trim());
    try {
      await api.systemStatus();
      onAuthenticated();
    } catch {
      setError("Key rejected — check NEMESIS_API_KEY in server/.env and try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <ModuleCard title="Access Control" tag="INJEXION.IO">
          <p>
            Enter the N.E.M.E.S.I.S bearer key to unlock the console. Find it in{" "}
            <code>server/.env</code> as <code>NEMESIS_API_KEY</code>, or in the server's
            startup log if you haven't set one yet.
          </p>
          <form onSubmit={submit}>
            <input
              type="text"
              placeholder="paste API key…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={checking || !key.trim()}>
              {checking ? "verifying…" : "connect"}
            </button>
          </form>
          {error && <div className="gate-error">{error}</div>}
        </ModuleCard>
      </div>
    </div>
  );
}
