"use client";

import { useState } from "react";
import styles from "./ChatDock.module.css";

export default function ChatDock(): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="chat-dock">
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Digital twin chat">
          <header className={styles.header}>
            <div className={styles.heading}>
              <span className={styles.headingDot} aria-hidden="true" />
              <div>
                <h3 className={styles.title}>my digital twin</h3>
                <p className={styles.subtitle}>chat with an AI agent of me</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className={styles.body}>
            <div className={styles.bubble}>
              <span className={styles.bubbleLabel}>samarth.ai</span>
              <p>
                Hey! I&apos;m Samarth&apos;s digital twin — an AI agent he&apos;s
                building to chat with visitors on his behalf.
              </p>
              <p>
                I&apos;m not wired up yet. Coming soon. In the meantime, feel
                free to explore his work above, or reach out via{" "}
                <a href="mailto:bapnadsamarth@gmail.com">email</a>.
              </p>
            </div>
          </div>

          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="coming soon..."
              disabled
              aria-label="Chat input (disabled)"
            />
            <button type="button" className={styles.send} disabled aria-label="Send">
              →
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? "close" : "ask my AI"}
      </button>
    </div>
  );
}
