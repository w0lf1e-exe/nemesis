import { useEffect, useState } from "react";
import { api } from "../api.js";
import { broadcastPartial } from "../sync/bus.js";

interface Status {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSeconds: number;
  hostUptimeSeconds: number;
  loadavg: number[];
  memory: { totalBytes: number; freeBytes: number };
  cpuCount: number;
  devRepoPath: string;
}

function fmtDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function fmtBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

export function SystemPanel({ onStatus }: { onStatus?: (s: Status) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const s = (await api.systemStatus()) as unknown as Status;
        if (!cancelled) {
          setStatus(s);
          setError(null);
          onStatus?.(s);
          broadcastPartial("system", {
            hostname: s.hostname,
            platform: s.platform,
            cpuCount: s.cpuCount,
            hostUptimeSeconds: s.hostUptimeSeconds,
            memory: s.memory,
          });
          broadcastPartial("online", true);
        }
      } catch {
        if (!cancelled) setError("lost link to core");
      }
    }
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memUsedPct = status
    ? Math.round(((status.memory.totalBytes - status.memory.freeBytes) / status.memory.totalBytes) * 100)
    : 0;

  return (
    <div className="card">
      <div className="card-header">
        <h2>System Telemetry</h2>
        <span className="tag">HOST</span>
      </div>
      <div className="card-body">
        {error && <div className="gate-error">{error}</div>}
        {status && (
          <div className="stats">
            <div className="stat">
              <div className="label">platform</div>
              <div className="value">{status.platform}</div>
            </div>
            <div className="stat">
              <div className="label">cpu cores</div>
              <div className="value">{status.cpuCount}</div>
            </div>
            <div className="stat">
              <div className="label">memory used</div>
              <div className="value">{memUsedPct}%</div>
            </div>
            <div className="stat">
              <div className="label">memory total</div>
              <div className="value">{fmtBytes(status.memory.totalBytes)}</div>
            </div>
            <div className="stat">
              <div className="label">host uptime</div>
              <div className="value">{fmtDuration(status.hostUptimeSeconds)}</div>
            </div>
            <div className="stat">
              <div className="label">node runtime</div>
              <div className="value">{status.nodeVersion}</div>
            </div>
            <div className="stat" style={{ gridColumn: "1 / -1" }}>
              <div className="label">dev repo path</div>
              <div className="value" style={{ fontSize: "0.72rem", wordBreak: "break-all" }}>
                {status.devRepoPath}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
