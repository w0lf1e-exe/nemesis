import { useEffect, useState } from "react";
import { api, type KaliStatus } from "../api.js";
import { useJob } from "../hooks/useJob.js";
import { ModuleCard } from "./ModuleCard.js";
import { Terminal } from "./Terminal.js";

export function KaliPanel() {
  const [status, setStatus] = useState<KaliStatus | null>(null);
  const job = useJob();

  useEffect(() => {
    api.kaliStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <ModuleCard title="Kali VM Uplink" tag="SSH">
      {status?.enabled ? (
        <>
          <div className="voice-transcript">
            configured: <b style={{ color: "var(--cyan)" }}>{status.user}@{status.host}:{status.port}</b>
          </div>
          <div className="row">
            <button
              disabled={job.running}
              onClick={() => job.run(() => api.kaliCheck(), "Kali uplink check")}
            >
              check connection &amp; tool inventory
            </button>
          </div>
          <Terminal text={job.output} status={job.status} />
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-dim)" }}>
          No Kali VM configured. Set <code>KALI_SSH_HOST</code> (and <code>KALI_SSH_KEY_PATH</code>) in{" "}
          <code>server/.env</code>, then restart the server to enable SSH-based tool execution on your Kali box.
        </p>
      )}
    </ModuleCard>
  );
}
