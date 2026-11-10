"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Path.module.css";
import Scene from "./Scene";

interface SubRole {
  readonly title: string;
  readonly meta: string;
}

interface Entry {
  readonly title: string;
  readonly sub: string;
  readonly meta: string;
  readonly subPath?: ReadonlyArray<SubRole>;
}

const entries: ReadonlyArray<Entry> = [
  {
    title: "Elektrobit",
    sub: "Software Developer · Bengaluru",
    meta: "2023 — Present",
    subPath: [
      { title: "Software Engineer", meta: "2025 — Present" },
      { title: "Associate Engineer", meta: "2024 — 2025" },
      { title: "Graduate Engineer Trainee", meta: "2023 — 2024" },
    ],
  },
  {
    title: "B.E. Information Science & Engineering",
    sub: "Dayananda Sagar College of Engineering · Bengaluru",
    meta: "2019 — 2023",
  },
  {
    title: "12th, PCMC",
    sub: "Mahesh PU College · Mangaluru",
    meta: "2019",
  },
  {
    title: "10th, CBSE",
    sub: "AECS Magnolia Maaruti Public School · Bengaluru",
    meta: "2017",
  },
];

const OPEN_S = 0.42;
const CLOSE_S = 0.4;

type MotionPlugin = typeof import("gsap/MotionPathPlugin").MotionPathPlugin;
type GsapApi = typeof import("gsap").gsap;
type RawPath = ReturnType<MotionPlugin["arrayToRawPath"]>;

interface Flight {
  path: RawPath;
  fitX: number;
  fitY: number;
}

interface MotionState {
  t: number;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function bow(dx: number, dy: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy) || 1;
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const amount = Math.min(72, length * 0.16);
  return {
    x: dx / 2 + nx * amount,
    y: dy / 2 + ny * amount,
  };
}

export default function Path(): React.ReactElement {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [live, setLive] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const motionRef = useRef<MotionState>({ t: 0 });
  const tweenRef = useRef<{ kill: () => void } | null>(null);
  const tokenRef = useRef<number>(0);
  const gsapRef = useRef<GsapApi | null>(null);
  const pluginRef = useRef<MotionPlugin | null>(null);
  const reducedRef = useRef<boolean>(false);
  const liveRef = useRef<boolean>(false);
  const closeRef = useRef<() => void>(() => undefined);
  liveRef.current = live;

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => {
      reducedRef.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      tweenRef.current?.kill();
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!live) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [live]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadGsap = async (): Promise<boolean> => {
    if (gsapRef.current && pluginRef.current) return true;
    try {
      const [core, pluginModule] = await Promise.all([
        import("gsap"),
        import("gsap/MotionPathPlugin"),
      ]);
      gsapRef.current = core.gsap;
      pluginRef.current = pluginModule.MotionPathPlugin;
      gsapRef.current.registerPlugin(pluginRef.current);
      return true;
    } catch {
      return false;
    }
  };

  const finishClose = (token: number): void => {
    if (token !== tokenRef.current) return;
    const overlay = overlayRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (overlay) overlay.style.visibility = "hidden";
    if (backdrop) {
      backdrop.style.opacity = "0";
      backdrop.style.pointerEvents = "none";
    }
    if (content) content.style.transform = "none";
    motionRef.current.t = 0;
    setLive(false);
    setSelectedEntry(null);
  };

  const paint = (flight: Flight, amount: number, showAtButton: boolean): void => {
    const overlay = overlayRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    const gsapApi = gsapRef.current;
    const plugin = pluginRef.current;
    if (!overlay || !backdrop || !content || !gsapApi || !plugin) return;
    motionRef.current.t = amount;
    const pos = plugin.getPositionOnPath(flight.path, amount);
    gsapApi.set(content, {
      x: pos.x,
      y: pos.y,
      scaleX: lerp(flight.fitX, 1, amount),
      scaleY: lerp(flight.fitY, 1, amount),
      transformOrigin: "50% 50%",
      opacity: 1,
    });
    const visible = showAtButton || amount > 0.002;
    overlay.style.visibility = visible ? "visible" : "hidden";
    backdrop.style.opacity = String(Math.min(1, amount * 1.6));
    backdrop.style.pointerEvents = amount > 0.05 ? "auto" : "none";
  };

  const measure = (): Flight | null => {
    const content = contentRef.current;
    const button = buttonRef.current;
    const gsapApi = gsapRef.current;
    const plugin = pluginRef.current;
    if (!content || !button || !gsapApi || !plugin) return null;
    gsapApi.set(content, { clearProps: "transform" });
    const pop = content.getBoundingClientRect();
    const btn = button.getBoundingClientRect();
    if (pop.width < 2 || pop.height < 2 || btn.width < 2 || btn.height < 2) return null;
    const dx = btn.left + btn.width / 2 - (pop.left + pop.width / 2);
    const dy = btn.top + btn.height / 2 - (pop.top + pop.height / 2);
    const mid = bow(dx, dy);
    const path = plugin.arrayToRawPath(
      [
        { x: dx, y: dy },
        { x: mid.x, y: mid.y },
        { x: 0, y: 0 },
      ],
      { curviness: 0.6 },
    );
    plugin.cacheRawPathMeasurements(path);
    return {
      path,
      fitX: Math.min(1, btn.width / pop.width),
      fitY: Math.min(1, btn.height / pop.height),
    };
  };

  const animateTo = async (target: number, token: number): Promise<void> => {
    const overlay = overlayRef.current;
    if (target === 1 && overlay) overlay.style.visibility = "hidden";
    const ready = await loadGsap();
    if (token !== tokenRef.current) return;
    if (!ready) {
      if (target === 1 && overlay && backdropRef.current && contentRef.current) {
        contentRef.current.style.transform = "none";
        overlay.style.visibility = "visible";
        backdropRef.current.style.opacity = "1";
        backdropRef.current.style.pointerEvents = "auto";
        motionRef.current.t = 1;
      } else {
        finishClose(token);
      }
      return;
    }
    const flight = measure();
    if (!flight || token !== tokenRef.current) {
      if (target === 0) finishClose(token);
      return;
    }
    const showAtButton = target === 1;
    const apply = (amount: number): void => paint(flight, amount, showAtButton);
    if (reducedRef.current) {
      apply(target);
      if (target === 0) finishClose(token);
      return;
    }
    tweenRef.current?.kill();
    apply(motionRef.current.t);
    const from = motionRef.current.t;
    await new Promise<void>((resolve) => {
      const gsapApi = gsapRef.current;
      if (!gsapApi) {
        resolve();
        return;
      }
      tweenRef.current = gsapApi.to(motionRef.current, {
        t: target,
        duration: target > from ? OPEN_S : CLOSE_S,
        ease: target > from ? "power3.out" : "power3.in",
        onUpdate: () => apply(motionRef.current.t),
        onComplete: () => resolve(),
      });
    });
    if (token !== tokenRef.current) return;
    if (target === 0) finishClose(token);
  };

  const openJourney = (entry: Entry): void => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    tweenRef.current?.kill();
    setSelectedEntry(entry);
    setLive(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== tokenRef.current) return;
        void animateTo(1, token);
      });
    });
  };

  const closeJourney = (): void => {
    if (motionRef.current.t <= 0 && !liveRef.current) return;
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    tweenRef.current?.kill();
    void animateTo(0, token);
  };
  closeRef.current = closeJourney;

  const modal = (
    <div
      ref={overlayRef}
      className={styles.modalOverlay}
      aria-hidden={!live}
    >
      <div
        ref={backdropRef}
        className={styles.modalBackdrop}
        onClick={closeJourney}
      />
      <div
        ref={contentRef}
        className={styles.modalContent}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className={styles.modalClose}
          onClick={closeJourney}
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>
        {selectedEntry && (
          <>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedEntry.title}</h3>
              <p className={styles.modalSubtitle}>{selectedEntry.sub}</p>
            </div>

            <ol className={styles.modalTimeline}>
              {selectedEntry.subPath?.map((subRole) => (
                <li key={subRole.title} className={styles.modalItem}>
                  <div className={styles.modalDot} aria-hidden="true" />
                  <div className={styles.modalRoleBody}>
                    <h4 className={styles.modalRoleTitle}>{subRole.title}</h4>
                    <span className={styles.modalRoleMeta}>{subRole.meta}</span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Scene
      id="path"
      className={styles.section}
      overlay={mounted ? createPortal(modal, document.body) : null}
    >
      <div className={styles.inner}>
        <span className="eyebrow">Path</span>
        <h2 className="section-title">The Journey So Far.</h2>

        <ol className={styles.timeline}>
          {entries.map((e) => (
            <li key={e.title} className={styles.item}>
              <div className={styles.dot} aria-hidden="true" />
              <div className={styles.body}>
                <div className={styles.row}>
                  <h3 className={styles.title}>{e.title}</h3>
                  <span className={styles.meta}>{e.meta}</span>
                </div>
                <p className={styles.sub}>{e.sub}</p>
                {e.subPath && (
                  <button
                    ref={buttonRef}
                    className={styles.expandButton}
                    onClick={() => openJourney(e)}
                    type="button"
                    aria-label="View internal journey at Elektrobit"
                  >
                    <span>View internal journey</span>
                    <span className={styles.expandArrow}>→</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Scene>
  );
}
