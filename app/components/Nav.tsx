"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Nav.module.css";

const links: ReadonlyArray<{ href: string; label: string }> = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#path", label: "Path" },
  { href: "#contact", label: "Contact" },
];

const SQUASH = 0.88;
const CENTER_LEAD = 0.08;
const FLIGHT_END = 0.8;
const FLIGHT_COLOR = "rgb(245, 243, 255)";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

type MotionPlugin = typeof import("gsap/MotionPathPlugin").MotionPathPlugin;
type Curve = ReturnType<MotionPlugin["arrayToRawPath"]>;
type Timeline = ReturnType<typeof import("gsap").gsap.timeline>;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function bowPoint(from: Box, dest: Box): Point {
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  const destX = dest.left + dest.width / 2;
  const destY = dest.top + dest.height / 2;
  const dx = destX - fromX;
  const dy = destY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bow = Math.min(108, length * 0.18);
  return {
    x: (fromX + destX) / 2 + nx * bow,
    y: Math.max(150, (fromY + destY) / 2 + ny * bow),
  };
}

function geometryKey(from: Box, dest: Box): string {
  return [
    Math.round(from.left),
    Math.round(from.top),
    Math.round(from.width),
    Math.round(from.height),
    Math.round(dest.left),
    Math.round(dest.top),
    Math.round(dest.width),
    Math.round(dest.height),
  ].join(":");
}

export default function Nav(): React.ReactElement {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const navRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLUListElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const inner = innerRef.current;
    const linkList = linksRef.current;
    const brand = brandRef.current;
    const title = document.querySelector("#top h1");
    const about = document.getElementById("about");
    const section = document.getElementById("top");
    if (
      !nav ||
      !inner ||
      !linkList ||
      !brand ||
      !(title instanceof HTMLElement) ||
      !about ||
      !section
    ) {
      return;
    }

    const flyer = document.createElement("div");
    flyer.className = styles.flyer;
    flyer.setAttribute("aria-hidden", "true");
    document.body.appendChild(flyer);

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let titleRestBottom = 0;
    let measuring = false;
    let frame = 0;
    let fromBox: Box | null = null;
    let alive = true;
    let gsapApi: typeof import("gsap").gsap | null = null;
    let motionApi: MotionPlugin | null = null;
    let timeline: Timeline | null = null;
    let flightTitle: HTMLDivElement | null = null;
    let firstSpan: HTMLElement | null = null;
    let lastSpan: HTMLElement | null = null;
    let parked = false;
    let slideSrc: { first: Box; last: Box } | null = null;
    let rigKey = "";
    let nameLock = false;
    let flightGen = 0;
    let jumpTween: { kill: () => void } | null = null;
    const sequence = { p: 0 };

    const clearRig = (): void => {
      timeline?.kill();
      timeline = null;
      firstSpan?.remove();
      lastSpan?.remove();
      firstSpan = null;
      lastSpan = null;
      parked = false;
      slideSrc = null;
      flightTitle?.remove();
      flightTitle = null;
      rigKey = "";
    };

    const measureTitleRest = (): void => {
      if (measuring) return;
      measuring = true;
      const previousPosition = section.style.position;
      const previousTop = section.style.top;
      section.style.position = "relative";
      section.style.top = "0px";
      const rect = title.getBoundingClientRect();
      titleRestBottom = rect.bottom + window.scrollY;
      section.style.position = previousPosition;
      section.style.top = previousTop;
      measuring = false;
    };

    const buildRig = (from: Box, dest: Box, key: string): void => {
      if (!gsapApi || !motionApi || from.width < 2 || from.height < 2 || dest.width < 2) return;
      clearRig();
      const gsap = gsapApi;
      const MotionPathPlugin = motionApi;
      const fromCx = from.left + from.width / 2;
      const fromCy = from.top + from.height / 2;
      const destCx = dest.left + dest.width / 2;
      const destCy = dest.top + dest.height / 2;
      const mid = bowPoint(from, dest);
      const path = MotionPathPlugin.arrayToRawPath(
        [
          { x: fromCx, y: fromCy },
          { x: mid.x, y: mid.y },
          { x: destCx, y: destCy },
        ],
        { curviness: 0.7 },
      );
      MotionPathPlugin.cacheRawPathMeasurements(path);

      const shell = document.createElement("div");
      shell.className = styles.flyerTitle;
      shell.style.left = `${from.left}px`;
      shell.style.top = `${from.top}px`;
      shell.style.width = `${from.width}px`;
      const clone = title.cloneNode(true);
      if (clone instanceof HTMLElement) {
        clone.style.margin = "0";
        clone.style.transform = "none";
        clone.style.width = `${from.width}px`;
        clone.style.maxWidth = "none";
        clone.style.color = FLIGHT_COLOR;
        clone.style.setProperty("-webkit-text-fill-color", FLIGHT_COLOR);
        clone.style.filter = "none";
        clone.style.mixBlendMode = "normal";
        shell.appendChild(clone);
        const spans = clone.querySelectorAll("span");
        const first = spans[0];
        const last = spans[1];
        if (first instanceof HTMLElement && last instanceof HTMLElement) {
          firstSpan = first;
          lastSpan = last;
          for (const span of [first, last]) {
            span.style.color = FLIGHT_COLOR;
            span.style.setProperty("-webkit-text-fill-color", FLIGHT_COLOR);
            span.style.filter = "none";
            span.style.mixBlendMode = "normal";
          }
        }
      }
      flyer.appendChild(shell);
      flightTitle = shell;
      gsap.set(shell, { transformOrigin: "50% 50%" });

      const phase: { compress: number; travel: number; settle: number } = {
        compress: 0,
        travel: 0,
        settle: 0,
      };
      const holdX = lerp(0.86, 0.36, 0.5);
      const fitX = dest.width / from.width;
      const fitY = dest.height / from.height;

      const place = (): void => {
        if (!flightTitle) return;
        const compress = phase.compress;
        const travel = phase.travel;
        const settle = phase.settle;
        const along = Math.min(1, travel * (1 + CENTER_LEAD));
        const onPath = MotionPathPlugin.getPositionOnPath(path, along);
        const x = travel === 0 ? fromCx : lerp(onPath.x, destCx, settle);
        const y = travel === 0 ? fromCy : lerp(onPath.y, destCy, settle);
        const arrive = travel <= 0.45 ? 0 : (travel - 0.45) / 0.55;
        const squeeze = Math.max(settle, arrive);
        gsap.set(flightTitle, {
          x: x - fromCx,
          y: y - fromCy,
          scaleX: lerp(lerp(1, holdX, compress), fitX, squeeze),
          scaleY: lerp(lerp(1, SQUASH, compress), fitY, squeeze),
        });
      };

      timeline = gsap.timeline({ paused: true, onUpdate: place });
      timeline.to(phase, { compress: 1, duration: 0.22, ease: "none" }, 0);
      timeline.to(phase, { travel: 1, duration: 0.56, ease: "none" }, 0.22);
      timeline.to(phase, { settle: 1, duration: 0.22, ease: "none" }, 0.78);
      rigKey = key;
    };

    const ensureRig = (from: Box, dest: Box): void => {
      const key = geometryKey(from, dest);
      const attached = flightTitle !== null && flyer.contains(flightTitle);
      if (key === rigKey && timeline && attached) return;
      buildRig(from, dest, key);
    };

    const scrollProgress = (): number => {
      const y = window.scrollY;
      const aboutArrive = about.getBoundingClientRect().top + y;
      const start = Math.max(0, aboutArrive - titleRestBottom);
      const end = aboutArrive;
      const span = end - start;
      const raw = span <= 1 ? (y >= end ? 1 : 0) : clamp01((y - start) / span);
      return reducedQuery.matches ? (raw >= 1 ? 1 : 0) : raw;
    };

    const heroTitleBox = (): Box => {
      const sticky = section.querySelector(".scene-sticky");
      const previousPosition = sticky instanceof HTMLElement ? sticky.style.position : "";
      if (sticky instanceof HTMLElement) sticky.style.position = "relative";
      const rect = title.getBoundingClientRect();
      const box: Box = {
        left: rect.left,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
      if (sticky instanceof HTMLElement) sticky.style.position = previousPosition;
      return box;
    };

    const glyphBox = (el: HTMLElement): Box | null => {
      const node = el.firstChild;
      if (!node) return null;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      range.detach();
      if (rect.width < 0.5 || rect.height < 0.5) return null;
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    };

    const brandParts = (): { first: Box; last: Box } | null => {
      const node = brand.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return null;
      const text = node.textContent ?? "";
      const space = text.indexOf(" ");
      if (space < 1) return null;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, space);
      const firstRect = range.getBoundingClientRect();
      range.setStart(node, space + 1);
      range.setEnd(node, text.length);
      const lastRect = range.getBoundingClientRect();
      range.detach();
      if (firstRect.width < 0.5 || lastRect.width < 0.5) return null;
      return {
        first: { left: firstRect.left, top: firstRect.top, width: firstRect.width, height: firstRect.height },
        last: { left: lastRect.left, top: lastRect.top, width: lastRect.width, height: lastRect.height },
      };
    };

    const restoreSpans = (): void => {
      if (!parked || !flightTitle || !firstSpan || !lastSpan) return;
      const heading = flightTitle.querySelector("h1");
      if (!(heading instanceof HTMLElement)) return;
      for (const span of [firstSpan, lastSpan]) {
        span.style.cssText = "";
        span.style.color = FLIGHT_COLOR;
        span.style.setProperty("-webkit-text-fill-color", FLIGHT_COLOR);
        heading.appendChild(span);
      }
      parked = false;
      slideSrc = null;
    };

    const parkSpan = (span: HTMLElement): void => {
      const computed = getComputedStyle(span);
      const family = computed.fontFamily;
      const weight = computed.fontWeight;
      const size = computed.fontSize;
      const spacing = computed.letterSpacing;
      const line = computed.lineHeight;
      const textTransform = computed.textTransform;
      flyer.appendChild(span);
      span.style.position = "fixed";
      span.style.margin = "0";
      span.style.left = "0px";
      span.style.top = "0px";
      span.style.display = "block";
      span.style.fontFamily = family;
      span.style.fontWeight = weight;
      span.style.fontSize = size;
      span.style.letterSpacing = spacing;
      span.style.lineHeight = line;
      span.style.textTransform = textTransform;
      span.style.whiteSpace = "pre";
      span.style.color = FLIGHT_COLOR;
      span.style.setProperty("-webkit-text-fill-color", FLIGHT_COLOR);
      span.style.filter = "none";
      span.style.mixBlendMode = "normal";
      span.style.transform = "none";
      span.style.transformOrigin = "0 0";
      const natural = glyphBox(span);
      span.dataset.nw = String(natural?.width ?? 0);
      span.dataset.nh = String(natural?.height ?? 0);
    };

    const placeSpan = (span: HTMLElement, from: Box, to: Box, t: number, aside: boolean): void => {
      const across = Math.min(1, t / 0.5);
      const lift = aside ? Math.max(0, (t - 0.45) / 0.55) : across;
      const left = lerp(from.left, to.left, across);
      const top = lerp(from.top, to.top, lift);
      const width = lerp(from.width, to.width, across);
      const height = lerp(from.height, to.height, across);
      const naturalW = Number(span.dataset.nw) || width;
      const naturalH = Number(span.dataset.nh) || height;
      const scaleX = naturalW > 0 ? width / naturalW : 1;
      const scaleY = naturalH > 0 ? height / naturalH : 1;
      span.style.transformOrigin = "0 0";
      span.style.transform = `scale(${scaleX}, ${scaleY})`;
      const current = glyphBox(span);
      if (!current) return;
      const hostLeft = Number.parseFloat(span.style.left) || 0;
      const hostTop = Number.parseFloat(span.style.top) || 0;
      span.style.left = `${hostLeft + (left - current.left)}px`;
      span.style.top = `${hostTop + (top - current.top)}px`;
    };

    const applySlide = (slide: number): void => {
      if (!firstSpan || !lastSpan) return;
      const dest = brandParts();
      if (!dest) return;
      if (!parked) {
        const first = glyphBox(firstSpan);
        const last = glyphBox(lastSpan);
        if (!first || !last) return;
        slideSrc = { first, last };
        parkSpan(firstSpan);
        parkSpan(lastSpan);
        parked = true;
      }
      if (!slideSrc) return;
      placeSpan(firstSpan, slideSrc.first, dest.first, slide, false);
      placeSpan(lastSpan, slideSrc.last, dest.last, slide, true);
    };

    const renderFlight = (progress: number, jump: boolean): void => {
      const flight = clamp01(progress / FLIGHT_END);
      const slide = clamp01((progress - FLIGHT_END) / (1 - FLIGHT_END));
      if (slide <= 0) restoreSpans();
      if (timeline) timeline.progress(flight);
      if (slide > 0 && timeline) applySlide(slide);
      const arrived = progress >= 0.999;
      if (jump) {
        title.style.opacity = "0";
        brand.classList.toggle(styles.visible, arrived);
        flyer.style.visibility = arrived ? "hidden" : "visible";
        return;
      }
      title.style.opacity = progress > 0 ? "0" : "";
      brand.classList.toggle(styles.visible, arrived);
      flyer.style.visibility = progress > 0 && !arrived ? "visible" : "hidden";
    };

    const releaseNameFlight = (): void => {
      flightGen += 1;
      jumpTween?.kill();
      jumpTween = null;
      nameLock = false;
      apply();
    };

    const startNameFlight = (direction: "forward" | "reverse", ms: number): void => {
      if (reducedQuery.matches || !gsapApi || ms < 1) return;
      const from = direction === "forward"
        ? {
            left: title.getBoundingClientRect().left,
            top: title.getBoundingClientRect().top,
            width: title.getBoundingClientRect().width,
            height: title.getBoundingClientRect().height,
          }
        : heroTitleBox();
      const destRect = brand.getBoundingClientRect();
      const dest: Box = {
        left: destRect.left,
        top: destRect.top,
        width: destRect.width,
        height: destRect.height,
      };
      ensureRig(from, dest);
      if (!timeline) return;
      flightGen += 1;
      const generation = flightGen;
      jumpTween?.kill();
      nameLock = true;
      sequence.p = direction === "forward" ? scrollProgress() : 1;
      renderFlight(sequence.p, true);
      jumpTween = gsapApi.to(sequence, {
        p: direction === "forward" ? 1 : 0,
        duration: ms / 1000,
        ease: "none",
        onUpdate: () => {
          if (generation !== flightGen) return;
          renderFlight(sequence.p, true);
        },
      });
    };

    const apply = (): void => {
      frame = 0;
      const y = window.scrollY;
      const aboutArrive = about.getBoundingClientRect().top + y;
      const start = Math.max(0, aboutArrive - titleRestBottom);
      const progress = scrollProgress();

      if (y <= start + 0.5) {
        const rect = title.getBoundingClientRect();
        fromBox = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }

      const linksWidth = linkList.offsetWidth;
      if (linksWidth > 0) {
        const innerWidth = inner.clientWidth;
        const pad = Number.parseFloat(getComputedStyle(inner).paddingRight) || 0;
        const centeredLeft = (innerWidth - linksWidth) / 2;
        const finalLeft = innerWidth - pad - linksWidth;
        const shift = (finalLeft - centeredLeft) * progress;
        linkList.style.transform = `translate(calc(-50% + ${shift.toFixed(2)}px), -50%)`;
      }

      if (nameLock) return;

      const reduced = reducedQuery.matches;
      const flying = !reduced && progress > 0 && progress < 1 && fromBox !== null && gsapApi !== null;
      if (flying && fromBox) {
        const dest = brand.getBoundingClientRect();
        ensureRig(fromBox, dest);
      }
      renderFlight(reduced ? (progress >= 1 ? 1 : 0) : progress, false);
    };

    const requestApply = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(apply);
    };

    const onScroll = (): void => {
      const nextScrolled = window.scrollY > 80;
      setScrolled((previous) => (previous === nextScrolled ? previous : nextScrolled));
      requestApply();
    };

    const onResize = (): void => {
      flightGen += 1;
      jumpTween?.kill();
      jumpTween = null;
      nameLock = false;
      measureTitleRest();
      fromBox = null;
      clearRig();
      onScroll();
    };

    const onNameFlight = (event: Event): void => {
      const detail = (event as CustomEvent<{ direction?: string; ms?: number }>).detail;
      if (!detail || (detail.direction !== "forward" && detail.direction !== "reverse")) return;
      startNameFlight(detail.direction, detail.ms ?? 0);
    };

    const onNameFlightRelease = (): void => {
      if (!nameLock && !jumpTween) return;
      releaseNameFlight();
    };

    const loadGenie = async (): Promise<void> => {
      const [core, pluginModule] = await Promise.all([
        import("gsap"),
        import("gsap/MotionPathPlugin"),
      ]);
      if (!alive) return;
      gsapApi = core.gsap;
      motionApi = pluginModule.MotionPathPlugin;
      gsapApi.registerPlugin(motionApi);
      apply();
    };

    measureTitleRest();
    onScroll();
    void loadGenie();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("portfolio-name-flight", onNameFlight);
    window.addEventListener("portfolio-name-flight-release", onNameFlightRelease);
    reducedQuery.addEventListener("change", requestApply);
    const fonts = document.fonts;
    if (fonts) fonts.ready.then(onResize).catch(() => undefined);

    return () => {
      alive = false;
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("portfolio-name-flight", onNameFlight);
      window.removeEventListener("portfolio-name-flight-release", onNameFlightRelease);
      reducedQuery.removeEventListener("change", requestApply);
      flightGen += 1;
      jumpTween?.kill();
      title.style.opacity = "";
      linkList.style.transform = "";
      clearRig();
      flyer.remove();
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}
    >
      <div ref={innerRef} className={styles.inner}>
        <a
          ref={brandRef}
          href="#top"
          className={styles.brand}
          aria-label="Back to top"
        >
          Samarth B S
        </a>
        <ul ref={linksRef} className={styles.links}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
