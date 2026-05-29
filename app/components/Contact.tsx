import styles from "./Contact.module.css";

interface Link {
  readonly label: string;
  readonly value: string;
  readonly href: string;
}

const links: ReadonlyArray<Link> = [
  {
    label: "Email",
    value: "bapnadsamarth@gmail.com",
    href: "mailto:bapnadsamarth@gmail.com",
  },
  {
    label: "GitHub",
    value: "raosam23",
    href: "https://github.com/raosam23",
  },
  {
    label: "LinkedIn",
    value: "samarth-bs",
    href: "https://www.linkedin.com/in/samarth-bs",
  },
  {
    label: "X / Twitter",
    value: "@iamsamrao123",
    href: "https://x.com/iamsamrao123",
  },
  {
    label: "Instagram",
    value: "@rao_sam_93",
    href: "https://www.instagram.com/rao_sam_93/",
  },
];

export default function Contact(): React.ReactElement {
  return (
    <section id="contact" className="section">
      <div className="container">
        <span className="eyebrow">Get in touch</span>
        <h2 className="section-title">Want to chat?</h2>

        <p className={styles.lead}>
          Open to interesting work — agents, retrieval systems, full-stack
          product. Email is fastest, but any of the below works.
        </p>

        <ul className={styles.list}>
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={styles.row}
              >
                <span className={styles.rowLabel}>{l.label}</span>
                <span className={styles.rowValue}>
                  {l.value}
                  <span className={styles.arrow} aria-hidden="true">→</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} Samarth B S · Bengaluru
        </footer>
      </div>
    </section>
  );
}
