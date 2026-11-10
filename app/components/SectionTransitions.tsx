"use client";

import { useLayoutEffect } from "react";

const SECTION_IDS = ["top", "about", "projects", "skills", "path", "contact"] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface PinTarget {
  frame: HTMLElement;
  dim: HTMLElement;
  start: number;
  end: number;
}

interface RiseTarget {
  card: HTMLElement;
  top: number;
  extra: number;
}

function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value);
}

function collectSections(): HTMLElement[] {
  const sections: HTMLElement[] = [];
  for (const id of SECTION_IDS) {
    const section = document.getElementById(id);
    if (section) sections.push(section);
  }
  return sections;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsScrollTimeline(): boolean {
  return (
    typeof CSS !== "undefined" &&
    CSS.supports("animation-timeline: scroll()") &&
    CSS.supports("animation-range: 0% 100%")
  );
}

let navigateTo: ((id: string) => void) | null = null;

export function requestSection(id: string): void {
  navigateTo?.(id);
}

function layoutTop(section: HTMLElement): number {
  const previousPosition = section.style.position;
  const previousTop = section.style.top;
  section.style.position = "relative";
  section.style.top = "0px";
  const top = section.getBoundingClientRect().top + window.scrollY;
  section.style.position = previousPosition;
  section.style.top = previousTop;
  return top;
}

function frameOf(section: HTMLElement): HTMLElement | null {
  const frame = section.querySelector(":scope > .scene-sticky > .scene-scale");
  return frame instanceof HTMLElement ? frame : null;
}

function cardOf(section: HTMLElement): HTMLElement | null {
  const card = section.querySelector(":scope > .scene-sticky .scene-card");
  return card instanceof HTMLElement ? card : null;
}

function dimOf(frame: HTMLElement): HTMLElement | null {
  const dim = frame.querySelector(":scope > .scene-dim");
  return dim instanceof HTMLElement ? dim : null;
}

/**
 * Apple-style scene pin. A viewport window sticks, and the next section
 * covers it. That window scales, rounds, and dims the same way for every
 * pair. Tall content slides inside the window before the cover starts.
 */
export default function SectionTransitions(): null {
  useLayoutEffect(() => {
    const sections = collectSections();
    const root = document.documentElement;
    const reduced = prefersReducedMotion();
    const timeline = !reduced && supportsScrollTimeline();
    let navGen = 0;
    let frame = 0;
    let pins: PinTarget[] = [];
    let rises: RiseTarget[] = [];
    let tops: number[] = [];
    let layingOut = false;

    root.dataset.sceneMode = reduced ? "reduced" : timeline ? "scroll-timeline" : "frame";
    if (!timeline) root.classList.add("scene-fallback");
    else root.classList.remove("scene-fallback");

    const clearInline = (section: HTMLElement): void => {
      section.style.transform = "";
      section.style.opacity = "";
      section.style.borderRadius = "";
      section.style.overflow = "";
      section.style.transformOrigin = "";
      section.style.boxShadow = "";
      const frame = frameOf(section);
      const card = cardOf(section);
      const dim = frame ? dimOf(frame) : null;
      if (!timeline && frame) {
        frame.style.transform = "";
        frame.style.borderRadius = "";
      }
      if (!timeline && card) card.style.transform = "";
      if (!timeline && dim) dim.style.opacity = "";
    };

    const layoutPins = (): void => {
      if (reduced || layingOut) return;
      layingOut = true;
      const viewport = window.innerHeight;
      sections.forEach((section) => {
        section.style.top = "";
        section.style.height = "";
        section.style.marginBottom = "";
      });
      sections.forEach((section, index) => {
        const card = cardOf(section);
        const frame = frameOf(section);
        const view = frame?.offsetHeight || viewport;
        const content = Math.max(card?.offsetHeight ?? view, view);
        const last = index === sections.length - 1;
        section.style.height = last ? `${content}px` : `${content + view}px`;
        section.style.marginBottom = last ? "" : `${-view}px`;
      });
      tops = sections.map((section) => layoutTop(section));
      const max = Math.max(1, document.documentElement.scrollHeight - viewport);
      const nextPins: PinTarget[] = [];
      const nextRises: RiseTarget[] = [];
      const percent = (start: number, end: number): string =>
        `${(start / max) * 100}% ${(end / max) * 100}%`;

      sections.forEach((section, index) => {
        const card = cardOf(section);
        const frame = frameOf(section);
        const dim = frame ? dimOf(frame) : null;
        const view = frame?.offsetHeight || viewport;
        const content = card?.offsetHeight ?? view;
        const extra = content - view;
        const sectionTop = tops[index] ?? 0;
        if (card && extra > 1) {
          card.style.setProperty("--scene-rise", `${-extra}px`);
          card.setAttribute("data-rise", "on");
          if (timeline) {
            card.style.setProperty("animation-range", percent(sectionTop, sectionTop + extra));
          } else {
            card.style.removeProperty("animation-range");
            nextRises.push({ card, top: sectionTop, extra });
          }
        } else if (card) {
          card.style.removeProperty("--scene-rise");
          card.removeAttribute("data-rise");
          card.style.removeProperty("animation-range");
          if (!timeline) card.style.transform = "";
        }

        const nextTop = tops[index + 1];
        if (!frame || !dim || nextTop === undefined) {
          frame?.removeAttribute("data-pin");
          frame?.style.removeProperty("animation-range");
          dim?.style.removeProperty("animation-range");
          return;
        }
        const end = nextTop;
        const start = Math.max(0, end - viewport);
        frame.setAttribute("data-pin", "on");
        if (timeline) {
          const range = percent(start, end);
          frame.style.setProperty("animation-range", range);
          dim.style.setProperty("animation-range", range);
        } else {
          frame.style.removeProperty("animation-range");
          dim.style.removeProperty("animation-range");
          nextPins.push({ frame, dim, start, end });
        }
      });
      pins = nextPins;
      rises = nextRises;
      layingOut = false;
      if (!timeline) paintFrame();
    };

    const paintFrame = (): void => {
      const y = window.scrollY;
      for (const rise of rises) {
        const progress = clamp((y - rise.top) / rise.extra, 0, 1);
        rise.card.style.transform = `translate3d(0, ${(-rise.extra * progress).toFixed(2)}px, 0)`;
      }
      for (const pin of pins) {
        const span = pin.end - pin.start;
        const progress = span <= 0 ? 0 : clamp((y - pin.start) / span, 0, 1);
        if (progress <= 0) {
          pin.frame.style.transform = "";
          pin.frame.style.borderRadius = "";
          pin.dim.style.opacity = "";
          continue;
        }
        const scale = 1 - progress * 0.1;
        pin.frame.style.transform = `scale(${scale.toFixed(4)})`;
        pin.frame.style.borderRadius = `${(progress * 28).toFixed(2)}px`;
        pin.dim.style.opacity = (progress * 0.36).toFixed(3);
      }
    };

    const onScroll = (): void => {
      if (timeline || reduced) return;
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paintFrame();
      });
    };

    const scrollInstant = (top: number): void => {
      window.scrollTo({ top, left: 0, behavior: "instant" });
    };

    const maxScroll = (): number =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const playScroll = (to: number): void => {
      const gen = ++navGen;
      root.style.scrollBehavior = "auto";
      const fromY = window.scrollY;
      const distance = to - fromY;
      const viewport = window.innerHeight;
      const duration = clamp((Math.abs(distance) / viewport) * 900, 650, 1200);
      const start = performance.now();

      const step = (now: number): void => {
        if (gen !== navGen) return;
        const t = clamp((now - start) / duration, 0, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        window.scrollTo(0, fromY + distance * eased);
        if (!timeline && !reduced) paintFrame();
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        root.style.scrollBehavior = "";
      };

      requestAnimationFrame(step);
    };

    const JUMP_MS = 900;
    const JUMP_EASE = "linear";

    interface JumpState {
      overlays: HTMLElement[];
      animations: Animation[];
      touched: HTMLElement[];
    }

    let jump: JumpState | null = null;

    const stripIds = (node: HTMLElement): void => {
      node.removeAttribute("id");
      node.querySelectorAll<HTMLElement>("[id]").forEach((el) => el.removeAttribute("id"));
    };

    const clearJump = (): void => {
      if (!jump) return;
      for (const animation of jump.animations) animation.cancel();
      for (const el of jump.touched) {
        el.style.animation = "";
        el.style.transform = "";
        el.style.borderRadius = "";
        el.style.opacity = "";
      }
      for (const overlay of jump.overlays) overlay.remove();
      jump = null;
      window.dispatchEvent(new CustomEvent("portfolio-name-flight-release"));
    };

    const makeOverlay = (section: HTMLElement, z: string, bakeCard: boolean): { shell: HTMLElement; frame: HTMLElement } => {
      const source = frameOf(section);
      const frame = (source ?? section).cloneNode(true) as HTMLElement;
      stripIds(frame);
      frame.style.position = "absolute";
      frame.style.inset = "0";
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.margin = "0";
      frame.style.animation = "none";
      const sourceCard = cardOf(section);
      const cloneCard = frame.querySelector(".scene-card");
      if (cloneCard instanceof HTMLElement) {
        cloneCard.style.animation = "none";
        cloneCard.style.transform = bakeCard && sourceCard
          ? getComputedStyle(sourceCard).transform
          : "none";
      }
      const cloneDim = frame.querySelector(".scene-dim");
      if (cloneDim instanceof HTMLElement) cloneDim.style.animation = "none";
      const shell = document.createElement("div");
      shell.className = "jump-overlay";
      shell.dataset.scene = section.id;
      shell.setAttribute("aria-hidden", "true");
      shell.style.position = "fixed";
      shell.style.inset = "0";
      shell.style.zIndex = z;
      shell.style.margin = "0";
      shell.style.pointerEvents = "none";
      shell.style.overflow = "hidden";
      shell.style.background = "#0c0817";
      shell.appendChild(frame);
      document.body.appendChild(shell);
      return { shell, frame };
    };

    const playCoverJump = (fromSection: HTMLElement, toSection: HTMLElement, dest: number, upward: boolean): void => {
      const gen = ++navGen;
      clearJump();
      scrollInstant(window.scrollY);
      const viewport = window.innerHeight;
      const overlays: HTMLElement[] = [];
      const animations: Animation[] = [];
      const touched: HTMLElement[] = [];
      jump = { overlays, animations, touched };
      const timing: KeyframeAnimationOptions = {
        duration: JUMP_MS,
        easing: JUMP_EASE,
        fill: "both",
      };

      if (!upward) {
        const frame = frameOf(fromSection);
        const dim = frame ? dimOf(frame) : null;
        if (frame) {
          const fromTransform = getComputedStyle(frame).transform;
          const fromRadius = getComputedStyle(frame).borderRadius;
          const fromOpacity = dim ? getComputedStyle(dim).opacity : "0";
          frame.style.animation = "none";
          touched.push(frame);
          if (dim) {
            dim.style.animation = "none";
            touched.push(dim);
          }
          animations.push(frame.animate(
            [
              { transform: fromTransform, borderRadius: fromRadius },
              { transform: "scale(0.9)", borderRadius: "28px" },
            ],
            timing
          ));
          if (dim) {
            animations.push(dim.animate(
              [{ opacity: fromOpacity }, { opacity: "0.36" }],
              timing
            ));
          }
        }
        const overlay = makeOverlay(toSection, "40", false);
        overlays.push(overlay.shell);
        animations.push(overlay.shell.animate(
          [
            { transform: `translate3d(0, ${viewport}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          timing
        ));
      } else {
        const targetOverlay = makeOverlay(toSection, "36", false);
        overlays.push(targetOverlay.shell);
        const targetDim = targetOverlay.frame.querySelector(".scene-dim");
        animations.push(targetOverlay.frame.animate(
          [
            { transform: "scale(0.9)", borderRadius: "28px" },
            { transform: "scale(1)", borderRadius: "0px" },
          ],
          timing
        ));
        if (targetDim instanceof HTMLElement) {
          animations.push(targetDim.animate(
            [{ opacity: "0.36" }, { opacity: "0" }],
            timing
          ));
        }
        const currentOverlay = makeOverlay(fromSection, "38", true);
        overlays.push(currentOverlay.shell);
        animations.push(currentOverlay.shell.animate(
          [
            { transform: "translate3d(0, 0, 0)" },
            { transform: `translate3d(0, ${viewport}px, 0)` },
          ],
          timing
        ));
      }

      const nameFlight =
        fromSection.id === "top" && toSection.id !== "top" && toSection.id !== "about"
          ? "forward"
          : toSection.id === "top" && fromSection.id !== "top" && fromSection.id !== "about"
            ? "reverse"
            : null;
      if (nameFlight === "reverse") {
        const incoming = overlays[0]?.querySelector("h1");
        if (incoming instanceof HTMLElement) incoming.style.opacity = "0";
      }
      if (nameFlight) {
        window.dispatchEvent(new CustomEvent("portfolio-name-flight", {
          detail: { direction: nameFlight, ms: JUMP_MS },
        }));
      }

      const lead = animations[animations.length - 1];
      if (!lead) return;
      lead.onfinish = (): void => {
        if (gen !== navGen) return;
        scrollInstant(dest);
        clearJump();
      };
    };

    const toIndex = (id: SectionId): number => sections.findIndex((item) => item.id === id);

    const activeIndex = (): number => {
      const y = window.scrollY + 2;
      let best = 0;
      tops.forEach((top, index) => {
        if (top <= y) best = index;
      });
      return best;
    };

    const navigate = (id: SectionId, push: boolean): void => {
      const section = document.getElementById(id);
      if (!section) return;
      const max = maxScroll();
      const dest = clamp(tops[toIndex(id)] ?? layoutTop(section), 0, max);
      const to = toIndex(id);

      if (push) {
        const nextHash = `#${id}`;
        if (window.location.hash !== nextHash) history.pushState(null, "", nextHash);
      }

      if (reduced || Math.abs(window.scrollY - dest) < 2) {
        navGen += 1;
        clearJump();
        scrollInstant(dest);
        root.style.scrollBehavior = "";
        return;
      }

      const from = activeIndex();
      const fromSection = sections[from];
      if (fromSection && to >= 0 && Math.abs(to - from) > 1) {
        playCoverJump(fromSection, section, dest, to < from);
        return;
      }

      clearJump();
      playScroll(dest);
    };

    const stopNav = (): void => {
      navGen += 1;
      root.style.scrollBehavior = "";
      clearJump();
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (reduced) {
        stopNav();
        return;
      }

      const viewport = window.innerHeight;
      const max = maxScroll();
      const page = viewport * 0.92;

      if (event.key === "PageDown") {
        event.preventDefault();
        playScroll(clamp(window.scrollY + page, 0, max));
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        playScroll(clamp(window.scrollY - page, 0, max));
        return;
      }
      if (event.key === " ") {
        if (target instanceof HTMLElement && target.closest("button, a")) return;
        event.preventDefault();
        const direction = event.shiftKey ? -1 : 1;
        playScroll(clamp(window.scrollY + direction * page, 0, max));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        playScroll(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        playScroll(max);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") stopNav();
    };

    const onClick = (event: MouseEvent): void => {
      if (typeof event.button === "number" && event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href^='#']");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      const id = href.slice(1);
      if (!isSectionId(id)) return;
      event.preventDefault();
      event.stopPropagation();
      navigate(id, true);
    };

    navigateTo = (id: string): void => {
      if (isSectionId(id)) navigate(id, true);
    };

    const onPop = (): void => {
      const raw = window.location.hash.replace(/^#/, "");
      navigate(isSectionId(raw) ? raw : "top", false);
    };

    const onResize = (): void => {
      layoutPins();
    };

    for (const section of sections) clearInline(section);
    layoutPins();

    const observer = new ResizeObserver(() => {
      layoutPins();
    });
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", stopNav, { passive: true });
    window.addEventListener("touchmove", stopNav, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);

    return () => {
      navGen += 1;
      clearJump();
      if (frame !== 0) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", stopNav);
      window.removeEventListener("touchmove", stopNav);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      navigateTo = null;
      root.style.scrollBehavior = "";
      root.classList.remove("scene-fallback");
      delete root.dataset.sceneMode;
      for (const section of sections) {
        section.style.top = "";
        section.style.height = "";
        section.style.marginBottom = "";
        const frame = frameOf(section);
        const card = cardOf(section);
        const dim = frame ? dimOf(frame) : null;
        frame?.removeAttribute("data-pin");
        frame?.style.removeProperty("animation-range");
        card?.removeAttribute("data-rise");
        card?.style.removeProperty("--scene-rise");
        card?.style.removeProperty("animation-range");
        dim?.style.removeProperty("animation-range");
        clearInline(section);
      }
    };
  }, []);

  return null;
}
