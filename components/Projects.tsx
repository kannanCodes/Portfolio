import { projects } from "@/data/projects";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  return (
    <section id="projects" style={{ paddingTop: "48px", paddingBottom: "48px" }}>
      <p
        className="font-mono text-neutral-400 uppercase"
        style={{ fontSize: "10px", letterSpacing: "0.2em", marginBottom: "16px" }}
      >
        Projects
      </p>

      <div>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
