"use client";

import { useLayoutEffect } from "react";

const SECTION_IDS = ["top", "about", "projects", "skills", "path", "contact"] as const;

type SectionId = (typeof SECTION_IDS)[number];

const ENTER_SETTLE = 0.12;
const DOWN_LEAD = 0.84;
const UP_LEAD = 0.7;
const UP_SPAN = 0.9;

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

function contentOf(section: HTMLElement): HTMLElement {
  const first = section.firstElementChild;
  return first instanceof HTMLElement ? first : section;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sectionTop(section: HTMLElement): number {
  return section.getBoundingClientRect().top + window.scrollY;
}

function maxScroll(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function shiftDistance(): number {
  return window.innerWidth <= 768 ? 28 : 48;
}

/**
 * Scroll and nav share one reveal: content fades and drifts until the
 * section settles. Progress follows scroll position, so wheel, trackpad,
 * and keyboard all move it. A nav click glides through the same range.
 */
export default function SectionTransitions(): null {
  useLayoutEffect(() => {
    const shown = new Set<string>();
    let navGen = 0;
    let reducedCleared = false;

    const clearContent = (el: HTMLElement): void => {
      el.style.opacity = "";
      el.style.transform = "";
    };

    const clearAll = (): void => {
      for (const section of collectSections()) clearContent(contentOf(section));
    };

    const paint = (el: HTMLElement, progress: number, dir: 1 | -1): void => {
      if (progress >= 0.999) {
        clearContent(el);
        return;
      }
      const opacity = progress.toFixed(3);
      const shift = (1 - progress) * shiftDistance() * dir;
      const transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      if (el.style.opacity !== opacity) el.style.opacity = opacity;
      if (el.style.transform !== transform) el.style.transform = transform;
    };

    const apply = (): void => {
      if (prefersReducedMotion()) {
        if (!reducedCleared) {
          clearAll();
          reducedCleared = true;
        }
        return;
      }
      reducedCleared = false;

      const viewport = window.innerHeight;
      const settle = viewport * ENTER_SETTLE;
      const upSpan = viewport * UP_SPAN;

      for (const section of collectSections()) {
        const rect = section.getBoundingClientRect();
        const el = contentOf(section);
        const onScreen = rect.bottom > 1 && rect.top < viewport - 1;

        if (!onScreen) {
          shown.delete(section.id);
          paint(el, 0, rect.top >= viewport - 1 ? 1 : -1);
          continue;
        }

        const visible =
          Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
        const headingFarAbove = rect.top < -viewport * 0.85;
        if (headingFarAbove && visible > viewport * 0.55) {
          shown.add(section.id);
          paint(el, 1, 1);
          continue;
        }

        if (shown.has(section.id)) {
          paint(el, 1, 1);
          continue;
        }

        let progress = 1;
        let dir: 1 | -1 = 1;
        if (rect.top >= 0) {
          progress = rect.top <= settle ? 1 : (viewport - rect.top) / (viewport - settle);
          dir = 1;
        } else {
          progress = (rect.top + upSpan) / upSpan;
          dir = -1;
        }
        progress = clamp(progress, 0, 1);
        if (progress >= 0.999) shown.add(section.id);
        paint(el, progress, dir);
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
      const start = performance.now();
      const duration = 680;

      const step = (now: number): void => {
        if (gen !== navGen) return;
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        window.scrollTo(0, fromY + (to - fromY) * eased);
        apply();
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        root.style.scrollBehavior = "";
      };

      requestAnimationFrame(step);
    };

    const navigate = (id: SectionId, push: boolean): void => {
      const section = document.getElementById(id);
      if (!section) return;

      const dest = clamp(sectionTop(section), 0, maxScroll());
      if (push) {
        const nextHash = `#${id}`;
        if (window.location.hash !== nextHash) history.pushState(null, "", nextHash);
      }

      if (prefersReducedMotion()) {
        navGen += 1;
        withInstantScroll(() => window.scrollTo(0, dest));
        apply();
        return;
      }

      if (Math.abs(window.scrollY - dest) < 2) {
        apply();
        return;
      }

      const viewport = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const readingThis =
        rect.top <= viewport * ENTER_SETTLE && rect.bottom >= viewport * 0.55;

      if (readingThis) {
        shown.add(id);
        playScroll(dest);
        return;
      }

      const goingDown = dest > window.scrollY;
      const lead = clamp(
        goingDown ? dest - viewport * DOWN_LEAD : dest + viewport * UP_LEAD,
        0,
        maxScroll()
      );
      const low = Math.min(lead, dest);
      const high = Math.max(lead, dest);
      const inRange = window.scrollY >= low - 1 && window.scrollY <= high + 1;

      shown.delete(id);
      if (!inRange) {
        withInstantScroll(() => window.scrollTo(0, lead));
        apply();
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
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (keys.includes(event.key)) stopNav();
    };

    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return;
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
      navigate(id, true);
    };

    const onPop = (): void => {
      const raw = window.location.hash.replace(/^#/, "");
      navigate(isSectionId(raw) ? raw : "top", false);
    };

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = (): void => apply();

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", stopNav, { passive: true });
    window.addEventListener("touchmove", stopNav, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScroll);
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    motion.addEventListener("change", onMotion);

    return () => {
      navGen += 1;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", stopNav);
      window.removeEventListener("touchmove", stopNav);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      motion.removeEventListener("change", onMotion);
      clearAll();
    };
  }, []);

  return null;
}
