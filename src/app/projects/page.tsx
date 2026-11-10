import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AddProjectButton, DeleteProjectButton, EditProjectButton } from "@/components/triggers";
import { requireUser } from "@/lib/auth";
import { getProjects } from "@/lib/data";
import type { ProjectDTO } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="Group related tasks. Every task belongs to one project."
        actions={
          <Suspense fallback={null}>
            <AdminActions />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <ProjectsData />
      </Suspense>
    </>
  );
}

async function AdminActions() {
  const viewer = await requireUser();
  return viewer.access === "ADMIN" ? <AddProjectButton /> : null;
}

async function ProjectsData() {
  const [viewer, projects] = await Promise.all([requireUser(), getProjects()]);
  const isAdmin = viewer.access === "ADMIN";

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <FolderKanban className="h-8 w-8 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-700">No projects yet</p>
        <p className="text-sm text-zinc-500">
          {isAdmin ? "Create a project, then add tasks to it." : "Ask an admin to create a project."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2 2xl:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} isAdmin={isAdmin} />
      ))}
    </div>
  );
}

function ProjectCard({ project, isAdmin }: { project: ProjectDTO; isAdmin: boolean }) {
  const percent = project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-indigo-50 px-2 font-mono text-xs font-semibold text-indigo-700">
          {project.key}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-zinc-900">{project.name}</h2>
          <p className="mt-0.5 line-clamp-2 wrap-break-word text-xs text-zinc-500">
            {project.description ?? "No description."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex">
            <EditProjectButton project={project} />
            <DeleteProjectButton project={project} />
          </div>
        )}
      </div>

      <dl className="grid grid-cols-3 border-y border-zinc-100 text-center">
        <Stat label="Open" value={project.openCount} />
        <Stat label="Done" value={project.doneCount} />
        <Stat label="Total" value={project.taskCount} />
      </dl>

      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${project.name} progress`}
        >
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs tabular-nums text-zinc-500">{percent}%</span>
        <Link
          href={`/?project=${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          View tasks <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-lg font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-xl bg-zinc-200/60" />
      ))}
    </div>
  );
}
