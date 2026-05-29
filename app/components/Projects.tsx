import styles from "./Projects.module.css";

interface Project {
  readonly title: string;
  readonly blurb: string;
  readonly stack: ReadonlyArray<string>;
  readonly hrefFrontend?: string;
  readonly hrefBackend?: string;
  readonly featured?: boolean;
}

const projects: ReadonlyArray<Project> = [
  {
    title: "IntelliPrep",
    blurb:
      "An AI mock-interview app. Upload a resume + JD, get a fit-score, then sit through an interview run by an 8-node LangGraph agent — it asks questions, judges your answers, follows up when something feels off, and writes you a verdict at the end. Everything streams live.",
    stack: ["LangGraph", "FastAPI", "Next.js", "PostgreSQL", "WebSockets"],
    hrefFrontend: "https://github.com/raosam23/intelli-prep-frontend",
    hrefBackend: "https://github.com/raosam23/intelli-prep-backend",
    featured: true,
  },
  {
    title: "QueryNest",
    blurb:
      "A research agent that writes its report as it works. A LangGraph pipeline searches the web, fact-checks what it finds, scores the sources, and streams a structured markdown report back to a Next.js frontend in real time.",
    stack: ["LangGraph", "FastAPI", "Next.js"],
    hrefFrontend: "https://github.com/raosam23/query-nest-frontend",
    hrefBackend: "https://github.com/raosam23/query-nest-backend",
  },
  {
    title: "Tactica",
    blurb:
      "Sports-only chatbot. Each question goes through a 7-agent AutoGen panel — stats, storytelling, debate, tactics, predictions, moderation — that argues using pgvector RAG plus live Tavily MCP web search, before a Moderator agent writes the final answer with citations.",
    stack: ["AutoGen", "FastAPI", "Next.js", "pgvector", "MCP"],
    hrefFrontend: "https://github.com/raosam23/tactica-frontend",
    hrefBackend: "https://github.com/raosam23/tactica-backend",
  },
];

function ProjectLinks({ p }: { p: Project }): React.ReactElement | null {
  if (!p.hrefFrontend && !p.hrefBackend) return null;
  return (
    <div className={styles.links}>
      {p.hrefFrontend ? (
        <a href={p.hrefFrontend} target="_blank" rel="noopener noreferrer">
          frontend ↗
        </a>
      ) : null}
      {p.hrefBackend ? (
        <a href={p.hrefBackend} target="_blank" rel="noopener noreferrer">
          backend ↗
        </a>
      ) : null}
    </div>
  );
}

function Card({
  p,
  className = "",
}: {
  p: Project;
  className?: string;
}): React.ReactElement {
  return (
    <article className={`${styles.card} ${className}`}>
      <div className={styles.cardTop}>
        <h3 className={styles.title}>{p.title}</h3>
        <p className={styles.blurb}>{p.blurb}</p>
      </div>
      <div className={styles.cardBottom}>
        <ul className={styles.stack}>
          {p.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <ProjectLinks p={p} />
      </div>
    </article>
  );
}

export default function Projects(): React.ReactElement {
  const featured = projects.find((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="section">
      <div className="container">
        <span className="eyebrow">Selected work</span>
        <h2 className="section-title">Things I&apos;ve built.</h2>

        <div className={styles.bento}>
          {featured ? <Card p={featured} className={styles.featured} /> : null}
          <div className={styles.row}>
            {rest.map((p) => (
              <Card key={p.title} p={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
