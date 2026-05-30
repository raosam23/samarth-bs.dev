import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero(): React.ReactElement {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.frame}>

        <div className={styles.right}>
          <Image
            src="/portrait.png"
            alt="Samarth B S"
            width={1448}
            height={1086}
            className={styles.portrait}
            priority
          />
        </div>

        <div className={styles.left}>
          <h1 className={styles.name}>
            <span className={styles.firstName}>Samarth</span>
            <span className={styles.lastName}>B S</span>
          </h1>

          <div className={styles.roleRow}>
            <span className={styles.roleDash} aria-hidden="true" />
            <span className={styles.role}>Full-Stack AI Engineer</span>
          </div>

          <p className={styles.tagline}>
            Based in <span className={styles.mark}>Bengaluru</span>, Writing{" "}
            <span className={styles.mark}>automotive software</span> at work
            during the day and building{" "}
            <span className={styles.mark}>multi-agent, LLM-based</span> web
            applications using <span className={styles.mark}>NextJs</span> during
            the night.
          </p>

          <div className={styles.ctaRow}>
            <a href="#projects" className={styles.cta}>
              <span className={styles.ctaArrow} aria-hidden="true">↳</span>
              <span className={styles.ctaText}>View work</span>
            </a>
            <a href="#contact" className={styles.ctaGhost}>
              <span className={styles.ctaText}>Contact me</span>
              <span className={styles.ctaArrow} aria-hidden="true">→</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
