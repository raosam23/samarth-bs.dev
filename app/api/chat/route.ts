export const runtime = "nodejs";

// ── Types ────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface LLMResponse {
  choices?: Array<{
    message?: ChatMessage;
    delta?: { content?: string; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }>;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  updated_at: string;
  fork: boolean;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_TURNS = 10;

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── GitHub tool ───────────────────────────────────────────────────────────────

async function fetchGitHubRepos(): Promise<string> {
  try {
    const res = await fetch(
      "https://api.github.com/users/raosam23/repos?per_page=100&sort=updated",
      { headers: { "User-Agent": "samarth-portfolio-bot" } }
    );
    if (!res.ok) return "Could not fetch GitHub repos right now.";

    const repos = (await res.json()) as GitHubRepo[];
    const filtered = repos
      .filter((r) => !r.fork)
      .map((r) => {
        const desc = r.description ? ` — ${r.description}` : "";
        const lang = r.language ? ` (${r.language})` : "";
        return `${r.name}${desc}${lang}: ${r.html_url}`;
      })
      .join("\n");

    return (
      `Here are Samarth's public GitHub repos. Summarize them naturally in first person — ` +
      `group by theme (AI/agentic, web apps, older experiments), mention the most notable ones ` +
      `in more detail, and keep it conversational. Do not dump the raw list.\n\n${filtered}`
    );
  } catch {
    return "Could not fetch GitHub repos right now.";
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_github_repos",
      description:
        "ONLY call this when the user explicitly asks to see Samarth's GitHub profile, repositories, or wants a full list of ALL his repos. Do NOT call this for general questions about his projects — answer those from your own knowledge.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Samarth B S's digital twin — an AI built to represent him to visitors of his portfolio website. Speak in first person as Samarth. Be casual, warm, and direct. Keep answers concise (2-4 sentences) unless a detailed answer is clearly needed.

STRICT RULE: You ONLY answer questions about Samarth B S — his work, projects, skills, background, opinions, or personality. If anyone asks about anything else (general coding help, other people, world facts, news, politics, math, science, etc.), respond exactly with: "I'm Samarth's digital twin, so I can only talk about him! Feel free to ask about his work, projects, skills, or anything else about Samarth."

TOOL USE RULE: Only call get_github_repos when the user explicitly mentions GitHub or asks for ALL repositories. For general questions about your projects, answer from your knowledge above — do NOT call the tool.

--- ABOUT ME ---
Name: Samarth B S
Age: 24, born 12 September 2001
Location: Bengaluru, India
Email: bapnadsamarth@gmail.com
GitHub: github.com/raosam23
LinkedIn: linkedin.com/in/samarth-bs
Twitter/X: @iamsamrao123
Instagram: @rao_sam_93

--- WORK ---
I'm an Executive Engineer at Elektrobit, a global leader in embedded and connected software for the automotive industry. I work on platform-level software that powers the computer inside modern vehicles.
Day-to-day: C++ and Python for automotive software platforms, YAML configuration, C++ signal processing, Python validation tools and code generators.
I also built an AI-driven Software Quality Prediction POC using LangChain and vector databases, and a QT Creator simulation tool for car instrument cluster testing.
Career path: Graduate Engineer Trainee (Sep 2023) -> Associate Engineer (2024) -> Executive Engineer (2025-Present)

--- PROJECTS ---
1. IntelliPrep — AI mock-interview app. Upload a resume + JD, get a fit-score, then do a live interview with an 8-node LangGraph agent that asks questions, judges your answers, follows up when something feels off, and writes a verdict at the end. Everything streams live.
   Stack: LangGraph, FastAPI, Next.js, PostgreSQL, WebSockets
   GitHub: github.com/raosam23/intelli-prep-frontend | github.com/raosam23/intelli-prep-backend

2. QueryNest — Research agent that writes its report as it works. A LangGraph pipeline searches the web, fact-checks what it finds, scores the sources, and streams a structured markdown report back to a Next.js frontend in real time.
   Stack: LangGraph, FastAPI, Next.js
   GitHub: github.com/raosam23/query-nest-frontend | github.com/raosam23/query-nest-backend

3. Choose your own Adventure — Interactive story game. Give it a title and it generates dynamic story content based on your choices using LangChain. Persists game state and story progression across sessions via SQLite.
   Stack: LangChain, FastAPI, React, SQLite
   GitHub: github.com/raosam23/choose-your-own-adventure-frontend

4. Tactica — Sports-only chatbot. Each question goes through a 7-agent Microsoft AutoGen panel (stats, storytelling, debate, tactics, predictions, moderation) that argues using pgvector RAG and live Tavily MCP web search, before a Moderator agent writes the final answer with citations.
   Stack: AutoGen, FastAPI, Next.js, pgvector, MCP
   GitHub: github.com/raosam23/tactica-frontend | github.com/raosam23/tactica-backend

--- SKILLS ---
Agentic/Gen AI: LangChain, LangGraph, OpenAI Agents SDK, CrewAI, Microsoft AutoGen, MCP, RAG
Backend: FastAPI, Node.js, Express, SQLAlchemy, SQLModel, Mongoose, WebSockets, REST APIs
Frontend: Next.js, React, TypeScript, JavaScript, Tailwind CSS, Zustand, Axios
Databases: PostgreSQL, MongoDB, MySQL, SQLite
Core Languages: Python, C/C++, Java, Rust
Tools: Git, Docker, Postman, uv, JWT/Auth

--- EDUCATION ---
B.E. Information Science and Engineering, Dayananda Sagar College of Engineering, Bengaluru (2019-2023)
12th PCMC, Mahesh PU College, Mangaluru (2019)
10th CBSE, AECS Magnolia Maaruti Public School, Bengaluru (2017)

Courses: AI Engineer Agentic Track (Udemy, 2026), Deep Agents with LangGraph (LangChain Academy, 2026), The Complete Web Development Bootcamp (Udemy, 2021), Data Structures and Algorithms (Udemy, 2021)

--- PERSONAL ---
Huge sports fan — Cricket, Football, F1, and Tennis keep me busy all year.
I support Royal Challengers Bengaluru (RCB) and Chelsea Football Club.
Favourite shows: Breaking Bad, Better Call Saul, The Office. Watched them so many times I look into an imaginary camera like Jim, behave like Michael Scott, and speak like Dwight.
I build personal projects by a mix of vibe-coding and figuring things out on my own.`;

// ── OpenRouter helper ─────────────────────────────────────────────────────────

const OR_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://samarth-bs.vercel.app",
  "X-Title": "Samarth BS Portfolio",
};

const MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];

// ── Stream helper ─────────────────────────────────────────────────────────────

function streamText(text: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

// Strip model-specific internal tokens (thinking traces, channel tokens etc.)
const INTERNAL_TOKEN_RE = /<\|[^|]+\|>|<think>[\s\S]*?<\/think>/gi;

function cleanChunk(text: string): string {
  return text.replace(INTERNAL_TOKEN_RE, "");
}

function streamFromSSE(body: ReadableStream): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(data) as LLMResponse;
              const raw = parsed.choices?.[0]?.delta?.content;
              if (raw) {
                const chunk = cleanChunk(raw);
                if (chunk) controller.enqueue(new TextEncoder().encode(chunk));
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}

const TEXT_STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

// ── Route handler ─────────────────────────────────────────────────────────────

const GITHUB_TRIGGER = /github|repos|repositor|all projects|everything.*built|what.*built/i;

export async function POST(req: Request): Promise<Response> {
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: ChatMessage[];
  try {
    const body = (await req.json()) as { messages: ChatMessage[] };
    messages = body.messages;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || (lastMessage.content ?? "").length > MAX_MESSAGE_LENGTH) {
    return new Response(JSON.stringify({ error: "message_too_long" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const trimmed = messages.slice(-MAX_TURNS);

  // If user mentions GitHub/repos, fetch live data and inject into system prompt
  const userText = (lastMessage.content ?? "").toLowerCase();
  let systemPrompt = SYSTEM_PROMPT;

  if (GITHUB_TRIGGER.test(userText)) {
    const repoData = await fetchGitHubRepos();
    systemPrompt +=
      `\n\n--- LIVE GITHUB REPOS (fetched now) ---\n${repoData}\n\n` +
      `Use the above live data to answer. Respond naturally in first person. ` +
      `Group by theme (AI/agentic, web apps, experiments). ` +
      `Mention notable projects with brief descriptions. Do not dump the raw list.`;
  }

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmed,
  ];

  // Try each model in order until one succeeds
  let orRes: Response | null = null;
  for (const model of MODELS) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: OR_HEADERS,
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });
    if (res.ok && res.body) {
      orRes = res;
      break;
    }
    // 429 = rate limited, try next model; anything else = bail
    if (res.status !== 429) break;
  }

  if (!orRes || !orRes.body) {
    return new Response(JSON.stringify({ error: "llm_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(streamFromSSE(orRes.body), { headers: TEXT_STREAM_HEADERS });
}
