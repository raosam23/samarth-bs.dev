"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ChatDock.module.css";

interface Message {
  readonly role: "user" | "assistant";
  readonly content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hey! I'm Samarth's AI twin. Ask me anything about him — his work, projects, skills, or even his football opinions.",
};

export default function ChatDock(): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMsg: Message = { role: "user", content: text };
    // Build the new full messages list
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    // Add empty assistant placeholder for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Send everything except the static welcome message to the API
    const apiMessages = next
      .slice(1) // skip WELCOME
      .filter((m) => m.content.trim() !== "")
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (res.status === 429) {
        setMessages((prev) => prev.slice(0, -1));
        setError("Too many messages — please try again in an hour.");
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.slice(0, -1));
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          });
        }
      }
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setError("Connection error. Please try again.");
    }

    setLoading(false);
  }, [input, loading, messages]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="chat-dock">
      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Digital twin chat">
          <header className={styles.header}>
            <div className={styles.heading}>
              <div>
                <h3 className={styles.title}>my digital twin</h3>
                <p className={styles.subtitle}>ask me anything about samarth</p>
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
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${
                  msg.role === "user" ? styles.userBubble : styles.assistantBubble
                }`}
              >
                {msg.role === "assistant" && (
                  <span className={styles.bubbleLabel}>samarth.ai</span>
                )}
                {msg.content === "" && loading && i === messages.length - 1 ? (
                  <div className={styles.typing} aria-label="Typing">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <p className={styles.bubbleText}>{msg.content}</p>
                )}
              </div>
            ))}
            {error !== null ? (
              <p className={styles.errorMsg}>{error}</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="What's on your mind?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              aria-label="Chat input"
              maxLength={500}
            />
            <button
              type="button"
              className={`${styles.send} ${
                !loading && input.trim() ? styles.sendActive : ""
              }`}
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
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
