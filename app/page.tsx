import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Path from "./components/Path";
import Contact from "./components/Contact";
import SectionTransitions from "./components/SectionTransitions";

export default function Home(): React.ReactElement {
  return (
    <main>
      <SectionTransitions />
      <Hero />
      <About />
      <Projects />
      <Skills />
      <Path />
      <Contact />
    </main>
  );
}
