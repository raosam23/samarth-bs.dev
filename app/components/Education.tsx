import styles from "./Education.module.css";

interface Entry {
  readonly title: string;
  readonly sub: string;
  readonly meta: string;
}

const entries: ReadonlyArray<Entry> = [
  {
    title: "Executive Engineer",
    sub: "Elektrobit · Bengaluru",
    meta: "2023 — Present",
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

export default function Education(): React.ReactElement {
  return (
    <section id="path" className="section">
      <div className="container">
        <span className="eyebrow">The path</span>
        <h2 className="section-title">A short timeline.</h2>

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
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
