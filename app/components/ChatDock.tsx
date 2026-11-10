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

const OPEN_S = 0.42;
const CLOSE_S = 0.4;

type MotionPlugin = typeof import("gsap/MotionPathPlugin").MotionPathPlugin;
type GsapApi = typeof import("gsap").gsap;
type RawPath = ReturnType<MotionPlugin["arrayToRawPath"]>;

interface Flight {
  path: RawPath;
  fitX: number;
  fitY: number;
}

interface MotionState {
  t: number;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function bow(dx: number, dy: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy) || 1;
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const amount = Math.min(72, length * 0.16);
  return {
    x: dx / 2 + nx * amount,
    y: dy / 2 + ny * amount,
  };
}

export default function ChatDock(): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const motionRef = useRef<MotionState>({ t: 0 });
  const tweenRef = useRef<{ kill: () => void } | null>(null);
  const tokenRef = useRef<number>(0);
  const gsapRef = useRef<GsapApi | null>(null);
  const pluginRef = useRef<MotionPlugin | null>(null);
  const reducedRef = useRef<boolean>(false);
  const openRef = useRef<boolean>(false);
  openRef.current = open;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => {
      reducedRef.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      tweenRef.current?.kill();
      query.removeEventListener("change", sync);
    };
  }, []);

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

  const loadGsap = async (): Promise<boolean> => {
    if (gsapRef.current && pluginRef.current) return true;
    try {
      const [core, pluginModule] = await Promise.all([
        import("gsap"),
        import("gsap/MotionPathPlugin"),
      ]);
      gsapRef.current = core.gsap;
      pluginRef.current = pluginModule.MotionPathPlugin;
      gsapRef.current.registerPlugin(pluginRef.current);
      return true;
    } catch {
      return false;
    }
  };

  const finishClose = (token: number): void => {
    if (token !== tokenRef.current) return;
    const panel = panelRef.current;
    if (panel) {
      panel.style.visibility = "hidden";
      panel.style.transform = "none";
    }
    motionRef.current.t = 0;
    setOpen(false);
  };

  const paint = (flight: Flight, amount: number, showAtButton: boolean): void => {
    const panel = panelRef.current;
    const gsapApi = gsapRef.current;
    const plugin = pluginRef.current;
    if (!panel || !gsapApi || !plugin) return;
    motionRef.current.t = amount;
    const pos = plugin.getPositionOnPath(flight.path, amount);
    gsapApi.set(panel, {
      x: pos.x,
      y: pos.y,
      scaleX: lerp(flight.fitX, 1, amount),
      scaleY: lerp(flight.fitY, 1, amount),
      transformOrigin: "50% 50%",
      opacity: 1,
    });
    const visible = showAtButton || amount > 0.002;
    panel.style.visibility = visible ? "visible" : "hidden";
  };

  const measure = (): Flight | null => {
    const panel = panelRef.current;
    const button = fabRef.current;
    const gsapApi = gsapRef.current;
    const plugin = pluginRef.current;
    if (!panel || !button || !gsapApi || !plugin) return null;
    gsapApi.set(panel, { clearProps: "transform" });
    const pop = panel.getBoundingClientRect();
    const btn = button.getBoundingClientRect();
    if (pop.width < 2 || pop.height < 2 || btn.width < 2 || btn.height < 2) return null;
    const dx = btn.left + btn.width / 2 - (pop.left + pop.width / 2);
    const dy = btn.top + btn.height / 2 - (pop.top + pop.height / 2);
    const mid = bow(dx, dy);
    const path = plugin.arrayToRawPath(
      [
        { x: dx, y: dy },
        { x: mid.x, y: mid.y },
        { x: 0, y: 0 },
      ],
      { curviness: 0.6 },
    );
    plugin.cacheRawPathMeasurements(path);
    return {
      path,
      fitX: Math.min(1, btn.width / pop.width),
      fitY: Math.min(1, btn.height / pop.height),
    };
  };

  const animateTo = async (target: number, token: number): Promise<void> => {
    const panel = panelRef.current;
    if (target === 1 && panel) panel.style.visibility = "hidden";
    const ready = await loadGsap();
    if (token !== tokenRef.current) return;
    if (!ready) {
      if (target === 1 && panel) {
        panel.style.transform = "none";
        panel.style.visibility = "visible";
        motionRef.current.t = 1;
      } else {
        finishClose(token);
      }
      return;
    }
    const flight = measure();
    if (!flight || token !== tokenRef.current) {
      if (target === 0) finishClose(token);
      return;
    }
    const showAtButton = target === 1;
    const apply = (amount: number): void => paint(flight, amount, showAtButton);
    if (reducedRef.current) {
      apply(target);
      if (target === 0) finishClose(token);
      return;
    }
    tweenRef.current?.kill();
    apply(motionRef.current.t);
    const from = motionRef.current.t;
    await new Promise<void>((resolve) => {
      const gsapApi = gsapRef.current;
      if (!gsapApi) {
        resolve();
        return;
      }
      tweenRef.current = gsapApi.to(motionRef.current, {
        t: target,
        duration: target > from ? OPEN_S : CLOSE_S,
        ease: target > from ? "power3.out" : "power3.in",
        onUpdate: () => apply(motionRef.current.t),
        onComplete: () => resolve(),
      });
    });
    if (token !== tokenRef.current) return;
    if (target === 0) finishClose(token);
  };

  const openChat = (): void => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    tweenRef.current?.kill();
    setOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== tokenRef.current) return;
        void animateTo(1, token);
      });
    });
  };

  const closeChat = (): void => {
    if (motionRef.current.t <= 0 && !openRef.current) return;
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    tweenRef.current?.kill();
    void animateTo(0, token);
  };

  return (
    <div className="chat-dock">
      {open ? (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Digital twin chat">
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
              onClick={closeChat}
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
        ref={fabRef}
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ""}`}
        onClick={() => (open ? closeChat() : openChat())}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        {open ? "close" : "ask my AI"}
      </button>
    </div>
  );
}
