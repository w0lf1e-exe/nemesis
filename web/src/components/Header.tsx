function BrandMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 100 100" className="brand-mark">
      <polygon
        points="50,4 93,27 93,73 50,96 7,73 7,27"
        fill="#05070a"
        stroke="#00f2d1"
        strokeWidth="4"
      />
      <polygon
        points="50,16 82,33 82,67 50,84 18,67 18,33"
        fill="none"
        stroke="#ff2b4d"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <text x="50" y="65" fontSize="44" textAnchor="middle" fill="#00f2d1" fontFamily="Orbitron, monospace" fontWeight="900">
        N
      </text>
    </svg>
  );
}

export function Header({ online, hostname }: { online: boolean; hostname?: string }) {
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
        <span className="brand-org">INJEXION.IO</span>
      </div>
    </header>
  );
}
