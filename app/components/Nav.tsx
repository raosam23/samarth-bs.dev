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
const TOOLBAR_DELTA = 160;

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

    const flightLayer = document.createElement("div");
    flightLayer.className = styles.flightLayer;
    flightLayer.setAttribute("aria-hidden", "true");
    document.body.appendChild(flightLayer);

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phoneQuery = window.matchMedia("(max-width: 720px)");
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
    let scrollStyle: HTMLStyleElement | null = null;
    let scrollKey = "";
    let scrollOn = false;
    let flightRange = "";
    let flightStartPx = 0;
    let flightEndPx = 0;
    let builtWidth = window.innerWidth;
    let builtHeight = window.innerHeight;
    let lastScrollAt = 0;
    let settleTimer = 0;
    let pieces: HTMLElement[] = [];
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
      const sticky = section.querySelector(".scene-sticky");
      const frameNode = section.querySelector(".scene-scale");
      const cardNode = section.querySelector(".scene-card");
      const stickyNode = sticky instanceof HTMLElement ? sticky : null;
      const frame = frameNode instanceof HTMLElement ? frameNode : null;
      const card = cardNode instanceof HTMLElement ? cardNode : null;
      const previous = {
        sectionPosition: section.style.position,
        sectionTop: section.style.top,
        stickyPosition: stickyNode?.style.position ?? "",
        frameAnimation: frame?.style.animation ?? "",
        frameTransform: frame?.style.transform ?? "",
        cardAnimation: card?.style.animation ?? "",
        cardTransform: card?.style.transform ?? "",
      };
      section.style.position = "relative";
      section.style.top = "0px";
      if (stickyNode) stickyNode.style.position = "relative";
      if (frame) {
        frame.style.animation = "none";
        frame.style.transform = "none";
      }
      if (card) {
        card.style.animation = "none";
        card.style.transform = "none";
      }
      const rect = title.getBoundingClientRect();
      titleRestBottom = rect.bottom + window.scrollY;
      section.style.position = previous.sectionPosition;
      section.style.top = previous.sectionTop;
      if (stickyNode) stickyNode.style.position = previous.stickyPosition;
      if (frame) {
        frame.style.animation = previous.frameAnimation;
        frame.style.transform = previous.frameTransform;
      }
      if (card) {
        card.style.animation = previous.cardAnimation;
        card.style.transform = previous.cardTransform;
      }
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

    const showJumpShell = (progress: number): void => {
      const show = progress < 0.999;
      if (flightTitle) flightTitle.style.visibility = show ? "visible" : "hidden";
      flyer.style.visibility = show ? "visible" : "hidden";
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
        setBarJump(progress);
        showJumpShell(progress);
        return;
      }
      title.style.opacity = progress > 0 ? "0" : "";
      brand.classList.toggle(styles.visible, arrived);
      showJumpShell(progress);
    };

    const scrollTimeline = (): boolean =>
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: scroll()") &&
      CSS.supports("animation-range: 0% 100%");

    const navBar = (): HTMLElement | null => {
      const node = brand.closest("nav");
      return node instanceof HTMLElement ? node : null;
    };

    const setFlightRange = (el: HTMLElement, range: string): void => {
      el.style.setProperty("animation-range", range);
    };

    const clearFlightRange = (el: HTMLElement): void => {
      el.style.removeProperty("animation-range");
    };

    const flightTargets = (): HTMLElement[] => {
      const bar = navBar();
      return bar ? [title, brand, bar, ...pieces] : [title, brand, ...pieces];
    };

    const applyFlightRange = (): void => {
      if (flightRange === "") return;
      for (const el of flightTargets()) setFlightRange(el, flightRange);
      navBar()?.style.setProperty("--name-flight-range", flightRange);
    };

    const setBarJump = (progress: number | null): void => {
      const bar = navBar();
      if (!bar) return;
      if (progress === null) {
        bar.style.removeProperty("--name-bar");
        bar.removeAttribute("data-name-jump");
        return;
      }
      bar.style.setProperty("--name-bar", clamp01(progress).toFixed(3));
      bar.setAttribute("data-name-jump", "on");
    };

    const removePieces = (): void => {
      for (const piece of pieces) piece.remove();
      pieces = [];
    };

    const suspendScrollFlight = (): void => {
      if (!scrollOn) return;
      for (const el of flightTargets()) {
        el.removeAttribute("data-name-flight");
        clearFlightRange(el);
      }
    };

    const resumeScrollFlight = (): void => {
      if (!scrollOn || !scrollStyle) return;
      for (const el of flightTargets()) el.setAttribute("data-name-flight", "scroll");
      applyFlightRange();
      setBarJump(null);
      title.style.opacity = "";
      brand.classList.remove(styles.visible);
      clearRig();
    };

    const flightRangeFor = (startPx: number, endPx: number): string => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return `${((startPx / max) * 100).toFixed(3)}% ${((endPx / max) * 100).toFixed(3)}%`;
    };

    const refreshFlightRange = (): void => {
      if (!scrollOn || flightEndPx <= flightStartPx) return;
      flightRange = flightRangeFor(flightStartPx, flightEndPx);
      applyFlightRange();
    };

    const makePiece = (
      source: HTMLElement,
      role: "first" | "last",
    ): { el: HTMLElement; center: Point } | null => {
      const computed = getComputedStyle(source);
      const el = document.createElement("div");
      el.className = styles.flightPiece;
      el.setAttribute("data-name-piece", role);
      el.textContent = source.textContent ?? "";
      el.style.fontFamily = computed.fontFamily;
      el.style.fontWeight = computed.fontWeight;
      el.style.fontSize = computed.fontSize;
      el.style.letterSpacing = computed.letterSpacing;
      el.style.lineHeight = computed.lineHeight;
      el.style.textTransform = computed.textTransform;
      flightLayer.appendChild(el);
      const glyph = glyphBox(el);
      if (!glyph) {
        el.remove();
        return null;
      }
      const host = el.getBoundingClientRect();
      const center: Point = { x: glyph.left + glyph.width / 2, y: glyph.top + glyph.height / 2 };
      el.style.transformOrigin = `${center.x - host.left}px ${center.y - host.top}px`;
      return { el, center };
    };

    const installScrollFlight = (): void => {
      if (!scrollTimeline() || reducedQuery.matches || !gsapApi || !motionApi) {
        scrollOn = false;
        return;
      }
      const motion = motionApi;
      if (scrollKey !== "") return;
      const spans = title.querySelectorAll("span");
      const firstSource = spans[0];
      const lastSource = spans[1];
      if (!(firstSource instanceof HTMLElement) || !(lastSource instanceof HTMLElement)) return;
      measureTitleRest();
      const y = window.scrollY;
      const aboutArrive = about.getBoundingClientRect().top + y;
      const start = Math.max(0, aboutArrive - titleRestBottom);
      const end = aboutArrive;
      const parts = brandParts();
      if (end - start < 2 || !parts) return;

      const frameEl = section.querySelector(".scene-scale");
      const cardEl = section.querySelector(".scene-card");
      const sticky = section.querySelector(".scene-sticky");
      const frameNode = frameEl instanceof HTMLElement ? frameEl : null;
      const cardNode = cardEl instanceof HTMLElement ? cardEl : null;
      const stickyNode = sticky instanceof HTMLElement ? sticky : null;
      const previous = {
        sectionPosition: section.style.position,
        sectionTop: section.style.top,
        stickyPosition: stickyNode?.style.position ?? "",
        frameAnimation: frameNode?.style.animation ?? "",
        frameTransform: frameNode?.style.transform ?? "",
        cardAnimation: cardNode?.style.animation ?? "",
        cardTransform: cardNode?.style.transform ?? "",
      };
      section.style.position = "relative";
      section.style.top = "0px";
      if (stickyNode) stickyNode.style.position = "relative";
      if (frameNode) {
        frameNode.style.animation = "none";
        frameNode.style.transform = "none";
      }
      if (cardNode) {
        cardNode.style.animation = "none";
        cardNode.style.transform = "none";
      }
      const firstRest = glyphBox(firstSource);
      const lastRest = glyphBox(lastSource);
      section.style.position = previous.sectionPosition;
      section.style.top = previous.sectionTop;
      if (stickyNode) stickyNode.style.position = previous.stickyPosition;
      if (frameNode) {
        frameNode.style.animation = previous.frameAnimation;
        frameNode.style.transform = previous.frameTransform;
      }
      if (cardNode) {
        cardNode.style.animation = previous.cardAnimation;
        cardNode.style.transform = previous.cardTransform;
      }
      if (!firstRest || !lastRest) return;

      const finalFirst = parts.first.width / firstRest.width;
      const finalLast = parts.last.width / lastRest.width;

      const view = frameNode?.offsetHeight || window.innerHeight;
      const frameWidth = frameNode?.offsetWidth || document.documentElement.clientWidth;
      const content = cardNode?.offsetHeight ?? view;
      const extra = Math.max(0, content - view);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const rangeOf = (node: HTMLElement | null): { start: number; end: number } => {
        const raw = node ? getComputedStyle(node).getPropertyValue("animation-range") : "";
        const percents = raw.split(/\s+/).filter((part: string) => part.endsWith("%"));
        if (percents.length >= 2) {
          const startPx = (Number.parseFloat(percents[0]) / 100) * maxScroll;
          const endPx = (Number.parseFloat(percents[1]) / 100) * maxScroll;
          if (endPx > startPx) return { start: startPx, end: endPx };
        }
        return { start: 0, end: maxScroll };
      };
      const pinRange = frameNode?.getAttribute("data-pin") === "on" ? rangeOf(frameNode) : null;
      const riseRange = cardNode?.getAttribute("data-rise") === "on" ? rangeOf(cardNode) : null;
      const pinScale = (scroll: number): number => {
        if (!pinRange) return 1;
        return 1 - 0.1 * clamp01((scroll - pinRange.start) / (pinRange.end - pinRange.start));
      };
      const cardShift = (scroll: number): number => {
        if (!riseRange || extra < 1) return 0;
        return -extra * clamp01((scroll - riseRange.start) / (riseRange.end - riseRange.start));
      };
      const startScale = pinScale(start);
      const shift = cardShift(start);
      const ox = frameWidth / 2;
      const oy = view / 2;
      const restCenter = (box: Box): Point => {
        const cx = box.left + box.width / 2;
        const cy = box.top + y + box.height / 2 + shift;
        return { x: ox + (cx - ox) * startScale, y: oy + (cy - oy) * startScale };
      };

      removePieces();
      const first = makePiece(firstSource, "first");
      const last = makePiece(lastSource, "last");
      if (!first || !last) {
        removePieces();
        return;
      }

      const firstFrom = restCenter(firstRest);
      const lastFrom = restCenter(lastRest);
      const firstDest: Point = {
        x: parts.first.left + parts.first.width / 2,
        y: parts.first.top + parts.first.height / 2,
      };
      const lastDest: Point = {
        x: parts.last.left + parts.last.width / 2,
        y: parts.last.top + parts.last.height / 2,
      };
      const lead: Box = {
        left: firstFrom.x - (firstRest.width * startScale) / 2,
        top: firstFrom.y - (firstRest.height * startScale) / 2,
        width: firstRest.width * startScale,
        height: firstRest.height * startScale,
      };
      const mid = bowPoint(lead, parts.first);
      const path = motion.arrayToRawPath(
        [firstFrom, { x: mid.x, y: mid.y }, firstDest],
        { curviness: 0.7 },
      );
      motion.cacheRawPathMeasurements(path);
      const offset: Point = { x: lastFrom.x - firstFrom.x, y: lastFrom.y - firstFrom.y };

      const poses = (percent: number): { first: string; last: string } => {
        const p = percent / 100;
        const flight = clamp01(p / FLIGHT_END);
        const slide = clamp01((p - FLIGHT_END) / (1 - FLIGHT_END));
        const travel = clamp01((flight - 0.22) / 0.56);
        const settle = clamp01((flight - 0.78) / 0.22);
        const onPath = motion.getPositionOnPath(path, Math.min(1, travel * (1 + CENTER_LEAD)));
        const leadX = travel === 0 ? firstFrom.x : lerp(onPath.x, firstDest.x, settle);
        const leadY = travel === 0 ? firstFrom.y : lerp(onPath.y, firstDest.y, settle);
        const firstScale = lerp(startScale, finalFirst, flight);
        const lastScale = lerp(startScale, finalLast, flight);
        const dip = 1 - (1 - SQUASH) * Math.sin(Math.PI * flight);
        const grow = firstScale / startScale;
        const rigidX = leadX + offset.x * grow;
        const rigidY = leadY + offset.y * grow * dip;
        const across = Math.min(1, slide / 0.5);
        const lift = Math.max(0, (slide - 0.45) / 0.55);
        const lastX = lerp(rigidX, lastDest.x, across);
        const lastY = lerp(rigidY, lastDest.y, lift);
        const visibility = percent >= 100 ? "hidden" : "visible";
        const frame = (piece: { center: Point }, x: number, py: number, scale: number): string =>
          `transform: translate3d(${(x - piece.center.x).toFixed(2)}px, ${(py - piece.center.y).toFixed(2)}px, 0) scale(${scale.toFixed(4)}, ${(scale * dip).toFixed(4)}); visibility: ${visibility};`;
        return {
          first: `${percent}% { ${frame(first, leadX, leadY, firstScale)} }`,
          last: `${percent}% { ${frame(last, lastX, lastY, lastScale)} }`,
        };
      };
      const marks: number[] = [];
      for (let i = 0; i < 50; i += 1) marks.push(i * 2);
      marks.push(99.9, 100);
      const samples = marks.map((percent: number) => poses(percent));

      flightStartPx = start;
      flightEndPx = end;
      flightRange = flightRangeFor(start, end);

      if (!scrollStyle) {
        scrollStyle = document.createElement("style");
        document.head.appendChild(scrollStyle);
      }
      scrollStyle.textContent = `@keyframes name-first-scroll { ${samples.map((s) => s.first).join(" ")} }
        @keyframes name-last-scroll { ${samples.map((s) => s.last).join(" ")} }
        @keyframes name-brand-scroll { 0%, 99.9% { opacity: 0; pointer-events: none; } 100% { opacity: 1; pointer-events: auto; } }`;
      pieces = [first.el, last.el];
      for (const el of flightTargets()) el.setAttribute("data-name-flight", "scroll");
      applyFlightRange();
      title.style.opacity = "";
      scrollKey = [window.innerWidth, window.innerHeight, Math.round(start), Math.round(end)].join(":");
      scrollOn = true;
    };

    const releaseNameFlight = (): void => {
      flightGen += 1;
      jumpTween?.kill();
      jumpTween = null;
      nameLock = false;
      resumeScrollFlight();
      apply();
    };

    const startNameFlight = (direction: "forward" | "reverse", ms: number): void => {
      if (reducedQuery.matches || !gsapApi || ms < 1) return;
      const titleRect = title.getBoundingClientRect();
      const inFlight = scrollOn && pieces.length === 2 && scrollProgress() > 0;
      let from: Box;
      if (direction === "reverse") {
        from = heroTitleBox();
      } else {
        from = {
          left: titleRect.left,
          top: titleRect.top,
          width: titleRect.width,
          height: titleRect.height,
        };
        if (inFlight) {
          const a = pieces[0].getBoundingClientRect();
          const b = pieces[1].getBoundingClientRect();
          const cx = (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2;
          const cy = (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2;
          from = {
            left: cx - titleRect.width / 2,
            top: cy - titleRect.height / 2,
            width: titleRect.width,
            height: titleRect.height,
          };
        }
      }
      const destRect = brand.getBoundingClientRect();
      const dest: Box = {
        left: destRect.left,
        top: destRect.top,
        width: destRect.width,
        height: destRect.height,
      };
      suspendScrollFlight();
      ensureRig(from, dest);
      if (!timeline) {
        resumeScrollFlight();
        return;
      }
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
      if (!reduced && gsapApi && motionApi) installScrollFlight();
      if (scrollOn && !reduced) return;

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
      lastScrollAt = performance.now();
      const nextScrolled = window.scrollY > 80;
      setScrolled((previous) => (previous === nextScrolled ? previous : nextScrolled));
      if (scrollOn && scrollKey !== "" && phoneQuery.matches && !reducedQuery.matches && !nameLock) return;
      apply();
    };

    const rebuildAll = (): void => {
      flightGen += 1;
      jumpTween?.kill();
      jumpTween = null;
      nameLock = false;
      setBarJump(null);
      measureTitleRest();
      fromBox = null;
      clearRig();
      scrollKey = "";
      builtWidth = window.innerWidth;
      builtHeight = window.innerHeight;
      onScroll();
    };

    const isTouch = (): boolean =>
      navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

    const settleFlight = (): void => {
      settleTimer = 0;
      if (!alive || !scrollOn || nameLock) return;
      if (performance.now() - lastScrollAt < 200) {
        settleTimer = window.setTimeout(settleFlight, 250);
        return;
      }
      const arrive = about.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(arrive - flightEndPx) > 2) {
        rebuildAll();
        return;
      }
      refreshFlightRange();
    };

    const onResize = (force: boolean): void => {
      const heightOnly =
        window.innerWidth === builtWidth &&
        Math.abs(window.innerHeight - builtHeight) < TOOLBAR_DELTA;
      if (!force && heightOnly && isTouch() && scrollOn && scrollKey !== "" && !nameLock) {
        refreshFlightRange();
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(settleFlight, 250);
        return;
      }
      rebuildAll();
    };

    const onWindowResize = (): void => onResize(false);

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
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("portfolio-name-flight", onNameFlight);
    window.addEventListener("portfolio-name-flight-release", onNameFlightRelease);
    reducedQuery.addEventListener("change", requestApply);
    const fonts = document.fonts;
    if (fonts) fonts.ready.then(() => onResize(true)).catch(() => undefined);

    return () => {
      alive = false;
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onWindowResize);
      window.clearTimeout(settleTimer);
      window.removeEventListener("portfolio-name-flight", onNameFlight);
      window.removeEventListener("portfolio-name-flight-release", onNameFlightRelease);
      reducedQuery.removeEventListener("change", requestApply);
      flightGen += 1;
      jumpTween?.kill();
      title.style.opacity = "";
      for (const el of flightTargets()) {
        el.removeAttribute("data-name-flight");
        clearFlightRange(el);
      }
      const bar = navBar();
      bar?.style.removeProperty("--name-flight-range");
      setBarJump(null);
      removePieces();
      linkList.style.transform = "";
      clearRig();
      scrollStyle?.remove();
      flyer.remove();
      flightLayer.remove();
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
