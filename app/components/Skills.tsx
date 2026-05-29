import styles from "./Skills.module.css";

interface SkillCategory {
  readonly title: string;
  readonly description: string;
  readonly skills: ReadonlyArray<string>;
}

const skillLogos: Record<string, string> = {
  // Agentic / Gen AI
  "LangChain": "/skills/Langchain.png",
  "LangGraph": "/skills/LangGraph.png",
  "OpenAI Agents SDK": "/skills/OpenAI.png",
  "CrewAI": "/skills/CrewAI.jpeg",
  "AutoGen": "/skills/AutoGen.jpeg",
  "MCP": "/skills/MCP.png",
  "RAG": "/skills/RAG.png",

  // Backend
  "FastAPI": "/skills/FastAPI.png",
  "Node.js": "/skills/Node.js.svg",
  "Express": "/skills/Express.png",
  "SQLAlchemy": "/skills/SQLAlchemy.png",
  "SQLModel": "/skills/SQLModel.png",
  "Mongoose": "/skills/Mongoose.png",
  "WebSockets": "/skills/Websockets.png",
  "REST APIs": "/skills/RestAPI.png",

  // Frontend
  "Next.js": "/skills/NextJs.png",
  "React": "/skills/reactjs.png",
  "TypeScript": "/skills/Typescript.png",
  "JavaScript": "/skills/javascript.png",
  "Tailwind CSS": "/skills/tailwind.png",
  "Zustand": "/skills/Zustand.jpeg",
  "Axios": "/skills/Axios.png",

  // Databases
  "PostgreSQL": "/skills/PostgreSQL.png",
  "MongoDB": "/skills/Mongodb.png",
  "MySQL": "/skills/mysql.png",
  "SQLite": "/skills/sqlite.jpeg",

  // Systems
  "C / C++": "/skills/c:c++.png",
  "Java": "/skills/java.png",
  "Python": "/skills/python.jpeg",
  "Rust": "/skills/rust.png",

  // Tools
  "Git": "/skills/git.png",
  "Docker": "/skills/docker.png",
  "Postman": "/skills/postman.png",
  "uv": "/skills/uv.png",
  "JWT / Auth": "/skills/jwt.png",
};

const categories: ReadonlyArray<SkillCategory> = [
  {
    title: "Agentic / Gen AI",
    description: "Building intelligent agents and workflows that reason, act and adapt.",
    skills: ["LangChain", "LangGraph", "OpenAI Agents SDK", "CrewAI", "AutoGen", "MCP", "RAG"],
  },
  {
    title: "Backend",
    description: "APIs, services and real-time systems built for scale.",
    skills: ["FastAPI", "Node.js", "Express", "SQLAlchemy", "SQLModel", "Mongoose", "WebSockets", "REST APIs"],
  },
  {
    title: "Frontend",
    description: "Modern interfaces built for performance and experience.",
    skills: ["Next.js", "React", "TypeScript", "JavaScript", "Tailwind CSS", "Zustand", "Axios"],
  },
  {
    title: "Databases",
    description: "Structured, unstructured and everything in between.",
    skills: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
  },
  {
    title: "Core Languages",
    description: "The languages that form my foundation.",
    skills: ["C / C++", "Java", "Python", "Rust"],
  },
  {
    title: "Tools",
    description: "Utilities and workflows that boost productivity.",
    skills: ["Git", "Docker", "Postman", "uv", "JWT / Auth"],
  },
];

export default function Skills(): React.ReactElement {
  return (
    <section id="skills" className={styles.section}>
      <div className={styles.inner}>
        <span className="eyebrow">Skills</span>
        <h2 className={`section-title ${styles.heading}`}>My Weapons of Choice.</h2>

        <div className={styles.grid}>
          {categories.map((cat) => (
            <div key={cat.title} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.title}>{cat.title}</span>
              </div>
              <p className={styles.description}>{cat.description}</p>
              <ul className={styles.skills}>
                {cat.skills.map((skill) => {
                  const logoUrl = skillLogos[skill];
                  return (
                    <li key={skill} className={styles.skill}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`${skill} logo`}
                          className={styles.skillIconImage}
                        />
                      ) : (
                        <span className={styles.skillIcon} />
                      )}
                      <span>{skill}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
