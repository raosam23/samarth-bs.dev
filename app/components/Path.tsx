"use client";

import { useState, useEffect } from "react";
import styles from "./Path.module.css";

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
    sub: "Software Developer · Bengaluru / Kochi",
    meta: "2023 — Present",
    subPath: [
      { title: "Executive Engineer", meta: "2025 — Present" },
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

export default function Path(): React.ReactElement {
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEntry(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (selectedEntry) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEntry]);

  return (
    <section id="path" className={styles.section}>
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
                    className={styles.expandButton}
                    onClick={() => setSelectedEntry(e)}
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

      {/* Modern timeline popup overlay */}
      <div
        className={`${styles.modalOverlay} ${selectedEntry ? styles.active : ""}`}
        onClick={() => setSelectedEntry(null)}
        aria-hidden={!selectedEntry}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.modalClose}
            onClick={() => setSelectedEntry(null)}
            aria-label="Close modal"
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
                      <span className={styles.modalRoleMeta}>
                        {subRole.meta}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
