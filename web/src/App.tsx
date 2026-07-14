import { useEffect, useState } from "react";
import { api, getApiKey } from "./api.js";
import { AuthGate } from "./components/AuthGate.js";
import { DevPanel } from "./components/DevPanel.js";
import { Header } from "./components/Header.js";
import { HudCore } from "./components/HudCore.js";
import { ParticleField } from "./components/ParticleField.js";
import { ReconPanel } from "./components/ReconPanel.js";
import { SystemPanel } from "./components/SystemPanel.js";
import { VoiceDock } from "./components/VoiceDock.js";
import { subscribeSync, type JobSyncState } from "./sync/bus.js";
import type { HologramVariant } from "./three/Hologram.js";

export function App() {
  const [authed, setAuthed] = useState(false);
  const [checkedInitial, setCheckedInitial] = useState(false);
  const [hostname, setHostname] = useState<string>();
  const [recon, setRecon] = useState<JobSyncState>();
  const [dev, setDev] = useState<JobSyncState>();

  useEffect(() => {
    async function bootstrap() {
      if (getApiKey()) {
        try {
          await api.systemStatus();
          setAuthed(true);
        } catch {
          setAuthed(false);
        }
      }
      setCheckedInitial(true);
    }
    bootstrap();
  }, []);

  useEffect(
    () =>
      subscribeSync((key, value) => {
        if (key === "recon") setRecon(value as JobSyncState);
        else if (key === "dev") setDev(value as JobSyncState);
      }),
    [],
  );

  if (!checkedInitial) return null;

  if (!authed) {
    return (
      <div className="app">
        <ParticleField />
        <Header online={false} />
        <AuthGate onAuthenticated={() => setAuthed(true)} />
      </div>
    );
  }

  const statusLine =
    recon?.status === "running"
      ? `SCANNING ${recon.target ?? ""}`.trim()
      : dev?.status === "running"
        ? "GIT ACTIVE"
        : "STANDBY";
  const hologramVariant: HologramVariant =
    recon?.status === "running" ? "globe" : dev?.status === "running" ? "node" : "core";

  return (
    <div className="app">
      <ParticleField />
      <Header online={authed} hostname={hostname} />
      <div className="hud-shell">
        <HudCore variant={hologramVariant} statusLine={statusLine} online={authed} />
      </div>
      <VoiceDock />
      <div className="grid">
        <div className="column">
          <ReconPanel />
        </div>
        <div className="column">
          <DevPanel />
          <SystemPanel onStatus={(s) => setHostname(s.hostname)} />
        </div>
      </div>
      <div className="footer-note">
        N.E.M.E.S.I.S · injexion.io · for authorized security testing and internal development use only
      </div>
    </div>
  );
}
