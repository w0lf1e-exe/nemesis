import { useEffect, useRef } from "react";

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
}

/** Drifting light motes across the workshop backdrop — decorative, never intercepts input. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let motes: Mote[] = [];

    function seed() {
      const count = Math.round((width * height) / 26000);
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.06,
        vy: -Math.random() * 0.12 - 0.02,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * devicePixelRatio;
      canvas!.height = height * devicePixelRatio;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      seed();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let raf = 0;
    let t = 0;
    function tick() {
      t += 0.016;
      ctx!.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -4) m.y = height + 4;
        if (m.x < -4) m.x = width + 4;
        if (m.x > width + 4) m.x = -4;
        const twinkle = 0.35 + 0.25 * Math.sin(t * 1.5 + m.phase);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(0, 242, 209, ${twinkle})`;
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden />;
}
