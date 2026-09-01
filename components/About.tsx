export default function About() {
  return (
    <section id="about" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
      <p
        className="font-mono text-neutral-400 uppercase"
        style={{ fontSize: "10px", letterSpacing: "0.2em", marginBottom: "24px" }}
      >
        About Me
      </p>

      <div style={{ maxWidth: "620px", display: "flex", flexDirection: "column", gap: "22px" }}>
        <p className="text-neutral-700" style={{ fontSize: "15px", lineHeight: 1.9 }}>
          I&apos;m a full-stack developer focused on building practical web applications and
          understanding the engineering behind them.
        </p>
        <p className="text-neutral-500" style={{ fontSize: "15px", lineHeight: 1.9 }}>
          I work primarily with JavaScript and TypeScript across the frontend and backend,
          with particular interest in backend architecture, APIs, authentication,
          real-time systems, and cloud deployment.
        </p>
        <p className="text-neutral-500" style={{ fontSize: "15px", lineHeight: 1.9 }}>
          Most of what I know has come from building projects from the ground up dealing
          with the problems that appear along the way, questioning why something works,
          and finding better ways to build it.
        </p>
        <p className="text-neutral-500" style={{ fontSize: "15px", lineHeight: 1.9 }}>
          I care about writing software that is understandable, maintainable, and
          useful not just software that works once.
        </p>
      </div>
    </section>
  );
}
