import styles from "./About.module.css";

export default function About(): React.ReactElement {
  return (
    <section id="about" className="section">
      <div className="container">
        <span className="eyebrow">About</span>
        <h2 className="section-title">A bit about me.</h2>

        <div className={styles.copy}>
          <p>
            I&apos;m an engineer at <strong>Elektrobit</strong> working on the
            C++ and Python that runs on a configuration-driven automotive
            software platform — vehicle signals, YAML-driven configs, the
            usual platform-team work.
          </p>
          <p>
            Outside of that, I spend most of my time on{" "}
            <strong>multi-agent LLM systems</strong>. The thing I keep coming
            back to is: an app doesn&apos;t really change because the model
            got smarter. It changes when you give it a small group of agents
            with the right tools, a graph that routes between them, and a UI
            that lets a user actually see what&apos;s going on.
          </p>
          <p>
            So that&apos;s mostly what I build — LangGraph and AutoGen
            pipelines on FastAPI, paired with Next.js apps that stream
            everything live over WebSockets.
          </p>
        </div>
      </div>
    </section>
  );
}
