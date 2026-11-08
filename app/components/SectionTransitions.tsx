"use client";

import { useLayoutEffect } from "react";

const SECTION_IDS = ["top", "about", "projects", "skills", "path", "contact"] as const;

type SectionId = (typeof SECTION_IDS)[number];

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

let navigateTo: ((id: string) => void) | null = null;

export function requestSection(id: string): void {
  navigateTo?.(id);
}

function pageTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    const parent: Element | null = node.offsetParent;
    node = parent instanceof HTMLElement ? parent : null;
  }
  return top;
}

/**
 * Apple-style scene pin. Scroll progress is how far the next section has
 * covered the outgoing one: 0 when that cover starts, 1 when the next
 * section is flush with the viewport. Progress pins the outgoing scene
 * and scrubs its scale, dim, radius, and shadow. The dim is an inset
 * scrim so the card stays solid. Nav clicks only animate scrollY, so
 * they run through this same function.
 */
export default function SectionTransitions(): null {
  useLayoutEffect(() => {
    const sections = collectSections();
    let navGen = 0;

    const clearScene = (section: HTMLElement): void => {
      section.style.transform = "";
      section.style.opacity = "";
      section.style.borderRadius = "";
      section.style.overflow = "";
      section.style.transformOrigin = "";
      section.style.boxShadow = "";
      section.style.zIndex = "";
    };

    const sceneLocked = (): boolean => document.body.style.overflow === "hidden";

    const apply = (): void => {
      if (prefersReducedMotion() || sceneLocked()) {
        for (const section of sections) clearScene(section);
        return;
      }

      const viewport = window.innerHeight;
      for (const section of sections) clearScene(section);

      for (let index = 0; index < sections.length - 1; index += 1) {
        const current = sections[index];
        const next = sections[index + 1];
        if (!current || !next) continue;

        const height = current.offsetHeight;
        const span = Math.min(height, viewport);
        if (span < 1) continue;

        const nextTop = pageTop(next) - window.scrollY;
        const progress = clamp(1 - nextTop / span, 0, 1);
        if (progress <= 0 || progress >= 1) continue;

        const hold = progress * span;
        const scale = 1 - progress * 0.16;
        const originY = height >= viewport ? height - viewport / 2 : height / 2;
        const dim = (0.22 * progress).toFixed(3);
        current.style.zIndex = "1";
        next.style.zIndex = "2";
        current.style.transformOrigin = `center ${originY}px`;
        current.style.transform = `translate3d(0, ${hold.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        current.style.borderRadius = `${Math.round(progress * 28)}px`;
        current.style.overflow = "hidden";
        current.style.boxShadow = `inset 0 0 0 100vmax rgba(12, 8, 23, ${dim}), 0 ${Math.round(28 * progress)}px ${Math.round(70 * progress)}px rgba(0, 0, 0, ${(0.45 * progress).toFixed(3)})`;
      }
    };

    const withInstantScroll = (run: () => void): void => {
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      run();
      root.style.scrollBehavior = previous;
    };

    const playScroll = (to: number): void => {
      const gen = ++navGen;
      const root = document.documentElement;
      root.style.scrollBehavior = "auto";
      const fromY = window.scrollY;
      const distance = to - fromY;
      const viewport = window.innerHeight;
      const duration = clamp((Math.abs(distance) / viewport) * 1100, 900, 6400);
      const start = performance.now();

      const step = (now: number): void => {
        if (gen !== navGen) return;
        const t = clamp((now - start) / duration, 0, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        window.scrollTo(0, fromY + distance * eased);
        apply();
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        root.style.scrollBehavior = "";
        apply();
      };

      requestAnimationFrame(step);
    };

    const navigate = (id: SectionId, push: boolean): void => {
      const section = document.getElementById(id);
      if (!section) return;
      const dest = clamp(
        pageTop(section),
        0,
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      );

      if (push) {
        const nextHash = `#${id}`;
        if (window.location.hash !== nextHash) history.pushState(null, "", nextHash);
      }

      if (prefersReducedMotion() || Math.abs(window.scrollY - dest) < 2) {
        navGen += 1;
        withInstantScroll(() => window.scrollTo(0, dest));
        apply();
        return;
      }

      playScroll(dest);
    };

    const onScroll = (): void => {
      apply();
    };

    const stopNav = (): void => {
      navGen += 1;
      document.documentElement.style.scrollBehavior = "";
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
      if (prefersReducedMotion()) {
        stopNav();
        return;
      }

      const viewport = window.innerHeight;
      const max = Math.max(0, document.documentElement.scrollHeight - viewport);
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

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = (): void => apply();
    const bodyObserver = new MutationObserver(() => apply());

    apply();
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", stopNav, { passive: true });
    window.addEventListener("touchmove", stopNav, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScroll);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    motion.addEventListener("change", onMotion);

    return () => {
      navGen += 1;
      bodyObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", stopNav);
      window.removeEventListener("touchmove", stopNav);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      motion.removeEventListener("change", onMotion);
      navigateTo = null;
      for (const section of sections) clearScene(section);
    };
  }, []);

  return null;
}
