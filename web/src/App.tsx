import { useEffect, useState } from "react";
import { api, getApiKey } from "./api.js";
import { AuthGate } from "./components/AuthGate.js";
import { DevPanel } from "./components/DevPanel.js";
import { Header } from "./components/Header.js";
import { ReconPanel } from "./components/ReconPanel.js";
import { SystemPanel } from "./components/SystemPanel.js";

export function App() {
  const [authed, setAuthed] = useState(false);
  const [checkedInitial, setCheckedInitial] = useState(false);
  const [hostname, setHostname] = useState<string>();

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

  if (!checkedInitial) return null;

  if (!authed) {
    return (
      <div className="app">
        <Header online={false} />
        <AuthGate onAuthenticated={() => setAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header online={authed} hostname={hostname} />
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
