"use client";

import { useEffect, useState } from "react";
import styles from "./Nav.module.css";

const links: ReadonlyArray<{ href: string; label: string }> = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#path", label: "Path" },
  { href: "#contact", label: "Contact" },
];

export default function Nav(): React.ReactElement {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [showBrand, setShowBrand] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Detect when the hero name element is scrolled past
    const nameElement = document.querySelector("#top h1");
    if (!nameElement) {
      const fallbackScroll = (): void => setShowBrand(window.scrollY > 300);
      fallbackScroll();
      window.addEventListener("scroll", fallbackScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("scroll", fallbackScroll);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBrand(!entry.isIntersecting);
      },
      {
        threshold: 0,
      }
    );

    observer.observe(nameElement);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ""} ${
        showBrand ? styles.hasBrand : ""
      }`}
    >
      <div className={styles.inner}>
        <a
          href="#top"
          className={`${styles.brand} ${showBrand ? styles.visible : ""}`}
          aria-label="Back to top"
        >
          Samarth B S
        </a>
        <ul className={styles.links}>
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
