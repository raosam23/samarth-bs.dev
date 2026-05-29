import styles from "./Skills.module.css";

export default function Skills(): React.ReactElement {
  return (
    <section id="skills" className="section">
      <div className="container">
        <span className="eyebrow">Stack</span>
        <h2 className="section-title">What I build with.</h2>

        <div className={styles.rows}>
          <div className={styles.row}>
            <h3 className={styles.label}>Day to day</h3>
            <p className={styles.items}>
              LangGraph · FastAPI · Next.js · TypeScript · PostgreSQL ·
              pgvector
            </p>
          </div>
          <div className={styles.row}>
            <h3 className={styles.label}>Comfortable with</h3>
            <p className={styles.items}>
              AutoGen · LangChain · OpenAI Agents SDK · MCP · Python · C++ ·
              Docker
            </p>
          </div>
        </div>

        <p className={styles.foot}>
          For the full list, my{" "}
          <a
            href="https://www.linkedin.com/in/samarth-bs"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>{" "}
          is probably more useful.
        </p>
      </div>
    </section>
  );
}
