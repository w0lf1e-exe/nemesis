import { useEffect, useRef } from "react";
import type * as THREE from "three";

export type HologramVariant = "core" | "globe" | "node";

const CYAN = 0x00f2d1;
const RED = 0xff2b4d;

function buildOuterGeometry(three: typeof THREE, variant: HologramVariant): THREE.BufferGeometry {
  switch (variant) {
    case "globe":
      return new three.SphereGeometry(1, 20, 14);
    case "node":
      return new three.TorusKnotGeometry(0.7, 0.22, 120, 12);
    case "core":
    default:
      return new three.IcosahedronGeometry(1, 1);
  }
}

function buildInnerGeometry(three: typeof THREE, variant: HologramVariant): THREE.BufferGeometry {
  return variant === "node" ? new three.IcosahedronGeometry(0.42, 0) : new three.IcosahedronGeometry(0.5, 0);
}

interface SceneHandle {
  three: typeof THREE;
  outer: THREE.LineSegments;
  inner: THREE.LineSegments;
}

/**
 * A small self-contained WebGL hologram: wireframe geometry, additive glow,
 * a counter-rotating inner shell, and a thin particle halo — the "floating
 * projection" look, rendered into whatever box it's given.
 *
 * three.js is loaded lazily (dynamic import) so the ~600KB engine never
 * blocks the initial console load — it streams in only once a hologram is
 * actually mounted. The renderer/scene/camera are built exactly once and
 * kept alive across `variant` changes (only the geometry is swapped) so
 * switching variants — e.g. idle → scanning → idle as jobs start and stop —
 * doesn't tear down and rebuild the WebGL context, which was visibly
 * flickering the hologram on every job transition.
 */
export function Hologram({ variant = "core", className }: { variant?: HologramVariant; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const sceneRef = useRef<SceneHandle | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    import("three").then((three) => {
      if (cancelled || !container) return;

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 3.1;

      const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const outer = new three.LineSegments(
        new three.WireframeGeometry(buildOuterGeometry(three, variantRef.current)),
        new three.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85 }),
      );
      scene.add(outer);

      const inner = new three.LineSegments(
        new three.WireframeGeometry(buildInnerGeometry(three, variantRef.current)),
        new three.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.35 }),
      );
      scene.add(inner);

      sceneRef.current = { three, outer, inner };

      // Thin halo of drifting points — the loose "data mote" scatter from the reference HUD.
      const particleCount = 90;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const r = 1.6 + Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const particleGeom = new three.BufferGeometry();
      particleGeom.setAttribute("position", new three.BufferAttribute(positions, 3));
      const particles = new three.Points(
        particleGeom,
        new three.PointsMaterial({ color: CYAN, size: 0.02, transparent: true, opacity: 0.55 }),
      );
      scene.add(particles);

      let raf = 0;
      const clock = new three.Clock();

      function resize() {
        if (!container) return;
        const { clientWidth, clientHeight } = container;
        if (clientWidth === 0 || clientHeight === 0) return;
        renderer.setSize(clientWidth, clientHeight);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      function animate() {
        const t = clock.getElapsedTime();
        outer.rotation.y = t * 0.35;
        outer.rotation.x = Math.sin(t * 0.2) * 0.25;
        inner.rotation.y = -t * 0.5;
        inner.rotation.x = t * 0.3;
        particles.rotation.y = t * 0.05;
        // Subtle holographic flicker rather than a steady glow.
        outer.material.opacity = 0.75 + Math.sin(t * 6) * 0.05 + Math.sin(t * 1.7) * 0.05;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      cleanup = () => {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        sceneRef.current = null;
        renderer.dispose();
        outer.geometry.dispose();
        outer.material.dispose();
        inner.geometry.dispose();
        inner.material.dispose();
        particleGeom.dispose();
        (particles.material as THREE.Material).dispose();
        container.removeChild(renderer.domElement);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []); // mount once — see the swap effect below for variant changes

  useEffect(() => {
    const handle = sceneRef.current;
    if (!handle) return; // scene isn't built yet — it'll pick up the latest variant via variantRef when it is
    const { three, outer, inner } = handle;
    outer.geometry.dispose();
    outer.geometry = new three.WireframeGeometry(buildOuterGeometry(three, variant));
    inner.geometry.dispose();
    inner.geometry = new three.WireframeGeometry(buildInnerGeometry(three, variant));
  }, [variant]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
