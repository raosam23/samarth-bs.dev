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
    let scrollShell: HTMLDivElement | null = null;
    let scrollStyle: HTMLStyleElement | null = null;
    let scrollKey = "";
    let scrollOn = false;
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
      const arrived = progress >= 0.999;
      const show = !arrived;
      if (flightTitle) flightTitle.style.visibility = show ? "visible" : "hidden";
      if (!scrollOn) flyer.style.visibility = show ? "visible" : "hidden";
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

    const bindScrollAnimation = (el: HTMLElement, name: string, range: string): void => {
      el.style.animationName = name;
      el.style.animationDuration = "auto";
      el.style.animationTimingFunction = "linear";
      el.style.animationFillMode = "both";
      el.style.setProperty("animation-timeline", "scroll(root block)");
      el.style.setProperty("animation-range", range);
    };

    const clearScrollAnimation = (el: HTMLElement): void => {
      el.style.animationName = "none";
    };

    const suspendScrollFlight = (): void => {
      if (!scrollOn || !scrollShell) return;
      scrollShell.style.visibility = "hidden";
      clearScrollAnimation(scrollShell);
      const slide = scrollShell.querySelector("[data-name-slide]");
      if (slide instanceof HTMLElement) clearScrollAnimation(slide);
      clearScrollAnimation(title);
      clearScrollAnimation(brand);
    };

    const resumeScrollFlight = (): void => {
      if (!scrollOn || !scrollShell || !scrollStyle) return;
      const range = scrollShell.dataset.range ?? "";
      scrollShell.style.visibility = "visible";
      flyer.style.visibility = "visible";
      bindScrollAnimation(scrollShell, "name-flight-scroll", range);
      const slide = scrollShell.querySelector("[data-name-slide]");
      if (slide instanceof HTMLElement) bindScrollAnimation(slide, "name-slide-scroll", range);
      bindScrollAnimation(title, "name-source-scroll", range);
      bindScrollAnimation(brand, "name-brand-scroll", range);
      title.style.opacity = "";
      brand.classList.remove(styles.visible);
      clearRig();
    };

    const installScrollFlight = (): void => {
      if (!scrollTimeline() || reducedQuery.matches || !gsapApi || !motionApi) {
        scrollOn = false;
        return;
      }
      if (scrollShell && scrollKey !== "") return;
      measureTitleRest();
      const y = window.scrollY;
      const aboutArrive = about.getBoundingClientRect().top + y;
      const start = Math.max(0, aboutArrive - titleRestBottom);
      const end = aboutArrive;
      const brandRect = brand.getBoundingClientRect();
      const key = [
        window.innerWidth,
        window.innerHeight,
        Math.round(start),
        Math.round(end),
        Math.round(brandRect.width),
        Math.round(brandRect.left),
      ].join(":");
      if (key === scrollKey && scrollShell) return;
      if (end - start < 2 || brandRect.width < 2) return;

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
      const natural = title.getBoundingClientRect();
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
      if (natural.width < 2 || natural.height < 2) return;

      const restTop = natural.top + y;
      const view = frameNode?.offsetHeight || window.innerHeight;
      const content = cardNode?.offsetHeight ?? view;
      const extra = Math.max(0, content - view);
      const pinSpan = Math.max(1, end - Math.max(0, end - view));
      const pinP = clamp01((start - Math.max(0, end - view)) / pinSpan);
      const riseP = extra > 1 ? clamp01(start / extra) : 0;
      const sc = 1 - 0.1 * pinP;
      const ty = -extra * riseP;
      const ox = window.innerWidth / 2;
      const oy = view / 2;
      const cx = natural.left + natural.width / 2;
      const cy = restTop + natural.height / 2 + ty;
      const vx = ox + (cx - ox) * sc;
      const vy = oy + (cy - oy) * sc;
      const from: Box = {
        left: vx - natural.width / 2,
        top: vy - natural.height / 2,
        width: natural.width,
        height: natural.height,
      };
      const dest: Box = {
        left: brandRect.left,
        top: brandRect.top,
        width: brandRect.width,
        height: brandRect.height,
      };
      const fromCx = vx;
      const fromCy = vy;
      const destCx = dest.left + dest.width / 2;
      const destCy = dest.top + dest.height / 2;
      const mid = bowPoint(from, dest);
      const path = motionApi.arrayToRawPath(
        [
          { x: fromCx, y: fromCy },
          { x: mid.x, y: mid.y },
          { x: destCx, y: destCy },
        ],
        { curviness: 0.7 },
      );
      motionApi.cacheRawPathMeasurements(path);

      const fitX = dest.width / natural.width;
      const fitY = dest.height / natural.height;
      const holdX = lerp(0.86, 0.36, 0.5);
      const samples: string[] = [];
      const steps = 16;
      for (let i = 0; i <= steps; i += 1) {
        const p = (i / steps) * FLIGHT_END;
        const flight = p / FLIGHT_END;
        const compress = clamp01(flight / 0.22);
        const travel = clamp01((flight - 0.22) / 0.56);
        const settle = clamp01((flight - 0.78) / 0.22);
        const along = Math.min(1, travel * (1 + CENTER_LEAD));
        const onPath = motionApi.getPositionOnPath(path, along);
        const x = travel === 0 ? fromCx : lerp(onPath.x, destCx, settle);
        const py = travel === 0 ? fromCy : lerp(onPath.y, destCy, settle);
        const arrive = travel <= 0.45 ? 0 : (travel - 0.45) / 0.55;
        const squeeze = Math.max(settle, arrive);
        const scaleX = lerp(lerp(sc, sc * holdX, compress), fitX, squeeze);
        const scaleY = lerp(lerp(sc, sc * SQUASH, compress), fitY, squeeze);
        const transform = `translate3d(${(x - fromCx).toFixed(2)}px, ${(py - fromCy).toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
        if (i === 0) {
          samples.push(`0% { transform: ${transform}; opacity: 0; }`);
          samples.push(`1% { transform: ${transform}; opacity: 1; }`);
        } else {
          samples.push(`${(p * 100).toFixed(2)}% { transform: ${transform}; opacity: 1; }`);
        }
      }
      const endX = destCx - fromCx;
      const endY = destCy - fromCy;
      samples.push(
        `97% { transform: translate3d(${endX.toFixed(2)}px, ${endY.toFixed(2)}px, 0) scale(${fitX.toFixed(4)}, ${fitY.toFixed(4)}); opacity: 1; }`,
      );
      samples.push(
        `100% { transform: translate3d(${endX.toFixed(2)}px, ${endY.toFixed(2)}px, 0) scale(${fitX.toFixed(4)}, ${fitY.toFixed(4)}); opacity: 0; }`,
      );

      if (!scrollShell) {
        scrollShell = document.createElement("div");
        scrollShell.setAttribute("aria-hidden", "true");
        scrollShell.dataset.scrollFlight = "on";
        flyer.appendChild(scrollShell);
      }
      scrollShell.replaceChildren();
      const clone = title.cloneNode(true);
      if (!(clone instanceof HTMLElement)) return;
      clone.style.margin = "0";
      clone.style.width = "100%";
      clone.style.transform = "none";
      clone.style.color = FLIGHT_COLOR;
      clone.style.setProperty("-webkit-text-fill-color", FLIGHT_COLOR);
      scrollShell.appendChild(clone);
      const slideSpan = clone.querySelectorAll("span")[1];
      const firstSpanEl = clone.querySelector("span");
      const slideX = firstSpanEl instanceof HTMLElement ? firstSpanEl.offsetWidth + 8 : 0;
      const slideY = slideSpan instanceof HTMLElement ? -slideSpan.offsetTop : 0;
      if (slideSpan instanceof HTMLElement) slideSpan.dataset.nameSlide = "on";

      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const range = `${((start / max) * 100).toFixed(3)}% ${((end / max) * 100).toFixed(3)}%`;
      scrollShell.dataset.range = range;
      scrollShell.style.position = "fixed";
      scrollShell.style.left = `${from.left}px`;
      scrollShell.style.top = `${from.top}px`;
      scrollShell.style.width = `${natural.width}px`;
      scrollShell.style.margin = "0";
      scrollShell.style.pointerEvents = "none";
      scrollShell.style.transformOrigin = "50% 50%";
      scrollShell.style.willChange = "transform, opacity";
      scrollShell.style.visibility = "visible";
      flyer.style.visibility = "visible";

      if (!scrollStyle) {
        scrollStyle = document.createElement("style");
        document.head.appendChild(scrollStyle);
      }
      const slideBlock = slideSpan instanceof HTMLElement
        ? `@keyframes name-slide-scroll {
            0%, 80% { transform: translate3d(0, 0, 0); }
            89% { transform: translate3d(${slideX.toFixed(2)}px, 0, 0); }
            97%, 100% { transform: translate3d(${slideX.toFixed(2)}px, ${slideY.toFixed(2)}px, 0); }
          }`
        : "";
      scrollStyle.textContent = `@keyframes name-flight-scroll { ${samples.join(" ")} }
        @keyframes name-source-scroll { 0% { opacity: 1; } 1% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes name-brand-scroll { 0%, 97% { opacity: 0; pointer-events: none; } 100% { opacity: 1; pointer-events: auto; } }
        ${slideBlock}`;
      bindScrollAnimation(scrollShell, "name-flight-scroll", range);
      if (slideSpan instanceof HTMLElement) bindScrollAnimation(slideSpan, "name-slide-scroll", range);
      bindScrollAnimation(title, "name-source-scroll", range);
      bindScrollAnimation(brand, "name-brand-scroll", range);
      title.style.opacity = "";
      scrollKey = key;
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
      scrollKey = "";
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
      title.style.animationName = "";
      brand.style.animationName = "";
      linkList.style.transform = "";
      clearRig();
      scrollShell?.remove();
      scrollStyle?.remove();
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
