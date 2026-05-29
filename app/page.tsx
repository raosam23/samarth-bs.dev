import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Path from "./components/Path";
import Contact from "./components/Contact";

export default function Home(): React.ReactElement {
  return (
    <main>
      <Hero />
      <About />
      <Projects />
      <Skills />
      <Path />
      <Contact />
    </main>
  );
}
