"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { ScrollTrigger } from "@/lib/gsap";

// DEV-ONLY diagnostic overlay. Renders nothing unless BOTH are true:
// the build is a development build, and the URL carries ?probe=1.
// Purpose: on devices where we only have screenshots (the iOS Simulator
// CI rig), this panel makes every screenshot an instrument readout of
// the scroll-animation pipeline: input events -> Lenis -> ScrollTrigger
// -> pin state. Delete this component and its one mount line in
// SmoothScroll.tsx to remove the instrument completely.

type Snap = {
  err: string;
  raf: number;
  lenisScroll: string;
  lenisEvents: number;
  scrollY: number;
  vh: string;
  touch: string;
  triggers: string[];
  pinPos: string;
};

export default function DebugProbe() {
  const [enabled, setEnabled] = useState(false);
  const [snap, setSnap] = useState<Snap | null>(null);
  const rafCount = useRef(0);
  const lenisEventCount = useRef(0);
  const lastError = useRef("none");

  // Count Lenis 'scroll' emissions and keep the instance reachable.
  const lenis = useLenis(() => {
    lenisEventCount.current += 1;
  });

  useEffect(() => {
    // Gate on the explicit ?probe=1 flag only, so this instrument works in
    // a production build too (Vercel preview or a local `next start`). It is
    // never linked and carries no secrets; strip this component before any
    // merge to the main branch.
    if (!window.location.search.includes("probe=1")) return;
    setEnabled(true);

    // Trap anything that could have silently killed the animation layer.
    const onError = (e: ErrorEvent) => {
      lastError.current = `${e.message} @${(e.filename || "").split("/").pop()}:${e.lineno}`;
    };
    const onReject = (e: PromiseRejectionEvent) => {
      lastError.current = `unhandled: ${String(e.reason).slice(0, 90)}`;
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);

    // Own requestAnimationFrame chain: if this counter freezes while the
    // interval below keeps painting, the browser stopped rAF (which would
    // starve the GSAP ticker that drives lenis.raf).
    let rafId = 0;
    const tick = () => {
      rafCount.current += 1;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // The panel updates on an interval, NOT on rAF, so it keeps reporting
    // even if rAF or the scroll pipeline is dead.
    const probeVh = document.createElement("div");
    probeVh.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100lvh;pointer-events:none;visibility:hidden";
    document.documentElement.appendChild(probeVh);

    const interval = window.setInterval(() => {
      const triggers = ScrollTrigger.getAll()
        .slice(0, 6)
        .map((t) => {
          const el = t.trigger as HTMLElement | null;
          const name = (el?.dataset?.probe || el?.className || "?")
            .toString()
            .slice(0, 10);
          return `${name} ${t.progress.toFixed(2)}${t.isActive ? "*" : ""}`;
        });
      const firstPin = ScrollTrigger.getAll().find((t) => t.pin)?.pin as
        | HTMLElement
        | undefined;
      setSnap({
        err: lastError.current,
        raf: rafCount.current,
        lenisScroll:
          lenis == null
            ? "NO LENIS"
            : `${Math.round(lenis.scroll)} smooth:${String(
                (lenis as unknown as { isSmooth?: boolean }).isSmooth ?? "?",
              )}`,
        lenisEvents: lenisEventCount.current,
        scrollY: Math.round(window.scrollY),
        vh: `inner:${window.innerHeight} lvh:${Math.round(
          probeVh.getBoundingClientRect().height,
        )}`,
        touch: `maxTouch:${navigator.maxTouchPoints} coarse:${window.matchMedia("(pointer: coarse)").matches}`,
        triggers,
        pinPos: firstPin
          ? getComputedStyle(firstPin).position
          : "no-pin-found",
      });
    }, 300);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
      cancelAnimationFrame(rafId);
      window.clearInterval(interval);
      probeVh.remove();
    };
  }, [lenis]);

  if (!enabled || !snap) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        left: 4,
        zIndex: 99999,
        background: "rgba(0,0,0,0.82)",
        color: "#7dff7d",
        font: "700 13px/1.45 monospace",
        padding: "6px 8px",
        pointerEvents: "none",
        maxWidth: "96vw",
        whiteSpace: "pre-wrap",
      }}
    >
      {[
        `ERR ${snap.err}`,
        `rAF ${snap.raf}  lenisEv ${snap.lenisEvents}`,
        `lenis ${snap.lenisScroll}`,
        `scrollY ${snap.scrollY}  ${snap.vh}`,
        snap.touch,
        `ST n=${ScrollTrigger.getAll().length} pin:${snap.pinPos}`,
        ...snap.triggers,
      ].join("\n")}
    </div>
  );
}
