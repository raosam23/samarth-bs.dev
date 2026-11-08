"use client";

import { useEffect } from "react";

const SECTION_IDS = ["top", "about", "projects", "skills", "path", "contact"] as const;

type SectionId = (typeof SECTION_IDS)[number];
type EnterDirection = "down" | "up";

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

function visibleAmount(rect: DOMRect, viewport: number): number {
  const start = Math.max(rect.top, 0);
  const end = Math.min(rect.bottom, viewport);
  return Math.max(0, end - start);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Settles a section's inner content when that section arrives.
 * Backgrounds stay still. The first screen does not play on load.
 * Hash links jump, then play the same settle.
 */
export default function SectionTransitions(): null {
  useEffect(() => {
    const visited = new Set<string>();
    const endListeners = new WeakMap<HTMLElement, (event: AnimationEvent) => void>();
    let lastIndex = 0;
    let ignoreScroll = false;
    const arrival = 32;

    const clearEnter = (section: HTMLElement): void => {
      const el = contentOf(section);
      const previous = endListeners.get(el);
      if (previous) {
        el.removeEventListener("animationend", previous);
        endListeners.delete(el);
      }
      el.classList.remove("section-enter-down", "section-enter-up");
    };

    const play = (section: HTMLElement, direction: EnterDirection): void => {
      if (prefersReducedMotion()) return;
      const el = contentOf(section);
      const previous = endListeners.get(el);
      if (previous) el.removeEventListener("animationend", previous);

      el.classList.remove("section-enter-down", "section-enter-up");
      void el.offsetWidth;

      const className = direction === "down" ? "section-enter-down" : "section-enter-up";
      const onEnd = (event: AnimationEvent): void => {
        if (event.target !== el) return;
        el.classList.remove("section-enter-down", "section-enter-up");
        el.removeEventListener("animationend", onEnd);
        endListeners.delete(el);
      };
      endListeners.set(el, onEnd);
      el.addEventListener("animationend", onEnd);
      el.classList.add(className);
    };

    const pruneOffscreen = (): void => {
      const viewport = window.innerHeight;
      for (const section of collectSections()) {
        const amount = visibleAmount(section.getBoundingClientRect(), viewport);
        if (amount < 1) {
          visited.delete(section.id);
          clearEnter(section);
        }
      }
    };

    const captureCurrent = (): void => {
      const viewport = window.innerHeight;
      const sections = collectSections();
      let focus = 0;

      for (let index = 0; index < sections.length; index += 1) {
        const section = sections[index];
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        const amount = visibleAmount(rect, viewport);
        if (amount < 1) {
          visited.delete(section.id);
          continue;
        }
        if (rect.top <= viewport * 0.42 && rect.bottom >= viewport * 0.42) focus = index;
        if (amount >= arrival) visited.add(section.id);
      }

      lastIndex = focus;
    };

    const evaluate = (): void => {
      if (ignoreScroll) return;
      const viewport = window.innerHeight;
      const sections = collectSections();
      let focus = lastIndex;

      for (let index = 0; index < sections.length; index += 1) {
        const section = sections[index];
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        const amount = visibleAmount(rect, viewport);

        if (amount < 1) {
          visited.delete(section.id);
          clearEnter(section);
          continue;
        }

        if (rect.top <= viewport * 0.42 && rect.bottom >= viewport * 0.42) focus = index;
        if (amount < arrival || visited.has(section.id)) continue;

        visited.add(section.id);
        const direction: EnterDirection = rect.top >= viewport * 0.5 ? "down" : "up";
        play(section, direction);
      }

      lastIndex = focus;
    };

    const jumpTo = (section: HTMLElement): void => {
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      section.scrollIntoView({ block: "start" });
      root.style.scrollBehavior = previous;
    };

    const navigate = (id: SectionId, push: boolean): void => {
      const sections = collectSections();
      const index = sections.findIndex((section) => section.id === id);
      const section = sections[index];
      if (!section || index < 0) return;

      const viewport = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const coversFocus = rect.top <= viewport * 0.42 && rect.bottom >= viewport * 0.42;
      const direction: EnterDirection = index >= lastIndex ? "down" : "up";

      ignoreScroll = true;
      visited.add(id);
      jumpTo(section);
      if (!coversFocus) play(section, direction);
      lastIndex = index;
      pruneOffscreen();

      if (push) {
        const nextHash = `#${id}`;
        if (window.location.hash !== nextHash) {
          history.pushState(null, "", nextHash);
        }
      }

      requestAnimationFrame(() => {
        ignoreScroll = false;
      });
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

    captureCurrent();
    window.addEventListener("scroll", evaluate, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("scroll", evaluate);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      for (const section of collectSections()) clearEnter(section);
    };
  }, []);

  return null;
}
