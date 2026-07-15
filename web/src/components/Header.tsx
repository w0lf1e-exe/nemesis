import { useState } from "react";
import { openExternalDisplay } from "../sync/externalWindow.js";
import { getTheme, nextTheme, setTheme, type ThemeName } from "../theme.js";

function BrandMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 100 100" className="brand-mark">
      <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" fill="var(--bg)" style={{ stroke: "var(--cyan)" }} strokeWidth="4" />
      <polygon
        points="50,16 82,33 82,67 50,84 18,67 18,33"
        fill="none"
        style={{ stroke: "var(--red)" }}
        strokeWidth="1.5"
        opacity="0.6"
      />
      <text x="50" y="65" fontSize="44" textAnchor="middle" style={{ fill: "var(--cyan)" }} fontFamily="Orbitron, monospace" fontWeight="900">
        N
      </text>
    </svg>
  );
}

const THEME_LABEL: Record<ThemeName, string> = {
  cyan: "◐ theme: cyan/red",
  emerald: "◑ theme: emerald",
};

export function Header({ online, hostname }: { online: boolean; hostname?: string }) {
  const [theme, setThemeState] = useState<ThemeName>(getTheme);

  function toggleTheme() {
    const next = nextTheme(theme);
    setTheme(next);
    setThemeState(next);
  }

  return (
    <header className="header">
      <div className="brand">
        <BrandMark />
        <div className="brand-titles">
          <h1>N.E.M.E.S.I.S</h1>
          <p className="acronym">
            Network Exploitation &amp; Multi-Stage Engagement Security Intelligence Center
          </p>
        </div>
      </div>
      <div className="status-strip">
        <span>
          <i className={`dot ${online ? "" : "offline"}`} />
          core link {online ? "ONLINE" : "OFFLINE"}
        </span>
        {hostname && (
          <span>
            host: <b>{hostname}</b>
          </span>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Switch color palette">
          {THEME_LABEL[theme]}
        </button>
        <button className="icon-btn" onClick={() => openExternalDisplay()} title="Open a mirrored HUD view for a second monitor or projector">
          ⧉ external display
        </button>
        <span className="brand-org">INJEXION.IO</span>
      </div>
    </header>
  );
}
