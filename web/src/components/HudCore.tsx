import { useEffect, useMemo, useState } from "react";
import { Hologram, type HologramVariant } from "../three/Hologram.js";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

export function HudCore({
  variant = "core",
  statusLine,
  online,
}: {
  variant?: HologramVariant;
  statusLine: string;
  online: boolean;
}) {
  const now = useClock();
  const time = useMemo(
    () =>
      now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    [now],
  );
  const date = useMemo(
    () => now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    [now],
  );

  return (
    <div className={`hud-core ${online ? "" : "offline"}`}>
      <svg className="hud-ticks" viewBox="0 0 300 300" aria-hidden>
        {TICKS.map((deg) => (
          <line
            key={deg}
            x1="150"
            y1="10"
            x2="150"
            y2={deg % 30 === 0 ? "24" : "18"}
            transform={`rotate(${deg} 150 150)`}
          />
        ))}
      </svg>
      <svg className="hud-ring-outer" viewBox="0 0 300 300" aria-hidden>
        <circle cx="150" cy="150" r="140" />
      </svg>
      <svg className="hud-ring-dashed" viewBox="0 0 300 300" aria-hidden>
        <circle cx="150" cy="150" r="118" />
      </svg>
      <svg className="hud-ring-dashed reverse" viewBox="0 0 300 300" aria-hidden>
        <circle cx="150" cy="150" r="100" />
      </svg>
      <div className="hud-hologram">
        <Hologram variant={variant} />
      </div>
      <div className="hud-readout">
        <div className="hud-clock">{time}</div>
        <div className="hud-date">{date}</div>
        <div className="hud-statusline">{statusLine}</div>
      </div>
    </div>
  );
}
