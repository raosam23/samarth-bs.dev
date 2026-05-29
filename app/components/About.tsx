import styles from "./About.module.css";

export default function About(): React.ReactElement {
  return (
    <section id="about" className={`section ${styles.section}`}>
      <div className="container">
        <span className="eyebrow">About</span>
        <h2 className={`section-title ${styles.heading}`}>Me, in a Nutshell.</h2>

        <div className={styles.grid}>

          {/* Left - professional */}
          <div className={styles.main}>
            <p className={styles.lead}>
              I'm an executive engineer at <strong>Elektrobit</strong> which is a global leader in
              embedded and connected software solutions for the automotive industry.
            </p>
            <p className={styles.para}>
              I work on platform-level software that helps power the computer inside modern
              vehicles. Currently, I'm also looking into the AI world, trying to understand
              it and integrate it with our software solutions.
            </p>
            <p className={styles.para}>
              Outside work, I build <strong>LLM-based web applications</strong> using agentic
              AI frameworks, multi-agent pipelines served over FastAPI backends with Next.js
              frontends. I build by a mix of vibe-coding and figuring things out on my own,
              which is kinda fun to be honest.
            </p>
          </div>

          {/* Right - personal */}
          <div className={styles.side}>
            <p className={styles.para}>
              In my free time I love watching sports or listening to music. Cricket, Football,
              F1, and Tennis keep me occupied pretty much the entire year.
            </p>

            <p className={styles.para}>
              I am a die-hard supporter of <strong>Royal Challengers Bengaluru</strong> and <strong>Chelsea Football Club</strong>.
            </p>

            <p className={styles.para}>
              I love binge watching <strong>Breaking Bad</strong>, <strong>Better Call Saul</strong>,
              and <strong>The Office</strong>. It has reached a point where I now look into
              an imaginary camera like Jim, behave like Michael Scott, and speak like Dwight.
            </p>

          </div>

        </div>
      </div>
    </section>
  );
}
