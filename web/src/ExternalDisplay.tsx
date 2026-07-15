import { useEffect, useState } from "react";
import { HudCore } from "./components/HudCore.js";
import { ParticleField } from "./components/ParticleField.js";
import { Terminal } from "./components/Terminal.js";
import { deriveActivity, subscribeSync, type JobSyncState, type SystemSyncState, type VoiceSyncState } from "./sync/bus.js";

function fmtBytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/** Read-only mirror meant for a second monitor/projector — never runs actions, only displays. */
export function ExternalDisplay() {
  const [recon, setRecon] = useState<JobSyncState>();
  const [dev, setDev] = useState<JobSyncState>();
  const [system, setSystem] = useState<SystemSyncState>();
  const [voice, setVoice] = useState<VoiceSyncState>();
  const [online, setOnline] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    return subscribeSync((key, value) => {
      if (key === "recon") setRecon(value as JobSyncState);
      else if (key === "dev") setDev(value as JobSyncState);
      else if (key === "system") setSystem(value as SystemSyncState);
      else if (key === "voice") setVoice(value as VoiceSyncState);
      else if (key === "online") setOnline(value as boolean);
    });
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const { statusLine, variant: hologramVariant } = deriveActivity(recon, dev);
  const hasFeed = Boolean(recon || dev);

  return (
    <div className="external">
      <ParticleField />
      <div className="external-header">
        <h1>N.E.M.E.S.I.S — EXTERNAL DISPLAY</h1>
        <div className="status-strip">
          <span>
            <i className={`dot ${online ? "" : "offline"}`} /> link {online ? "SYNCED" : "WAITING"}
          </span>
          <span className="brand-org">INJEXION.IO</span>
          <button onClick={() => (isFullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>
            {isFullscreen ? "⤢ exit fullscreen" : "⛶ fullscreen"}
          </button>
        </div>
      </div>

      {!online && !hasFeed ? (
        <div className="external-empty">
          <h2>AWAITING UPLINK</h2>
          <p>
            Keep the primary N.E.M.E.S.I.S console open in another tab or window — telemetry, hologram state, and
            job output stream here automatically once it's running.
          </p>
        </div>
      ) : (
        <div className="external-grid">
          <div className="external-feed">
            <h3>Recon Feed</h3>
            {recon ? (
              <>
                <div className="voice-transcript">
                  {recon.label} · {recon.target} · {recon.status}
                </div>
                <Terminal text={recon.output} status={recon.status} />
              </>
            ) : (
              <div className="voice-transcript idle-hint">no recon activity yet</div>
            )}
          </div>

          <div className="external-hud">
            <HudCore variant={hologramVariant} statusLine={statusLine} online={online} />
          </div>

          <div className="external-feed">
            <h3>Dev Feed</h3>
            {dev ? (
              <>
                <div className="voice-transcript">
                  {dev.label} · {dev.status}
                </div>
                <Terminal text={dev.output} status={dev.status} />
              </>
            ) : (
              <div className="voice-transcript idle-hint">no dev activity yet</div>
            )}

            {system && (
              <div className="stats">
                <div className="stat">
                  <div className="label">host</div>
                  <div className="value">{system.hostname}</div>
                </div>
                <div className="stat">
                  <div className="label">cores</div>
                  <div className="value">{system.cpuCount}</div>
                </div>
                <div className="stat">
                  <div className="label">memory</div>
                  <div className="value">{fmtBytes(system.memory.totalBytes - system.memory.freeBytes)}</div>
                </div>
                <div className="stat">
                  <div className="label">uptime</div>
                  <div className="value">{fmtDuration(system.hostUptimeSeconds)}</div>
                </div>
              </div>
            )}

            {voice && (
              <div className="voice-transcript">
                {voice.speaking ? <span className="speaking">NEMESIS speaking…</span> : voice.transcript ? `heard: "${voice.transcript}"` : "voice link idle"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
