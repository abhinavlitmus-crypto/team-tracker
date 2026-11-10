import { Suspense } from "react";
import { Board, BoardSkeleton } from "@/components/board/board";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getDayContext, getMembers, getProjects, getTasks } from "@/lib/data";

export default function BoardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Board" description="Drag your cards between columns to update their status." />
      <Suspense fallback={<BoardSkeleton />}>
        <BoardData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BoardData({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [viewer, tasks, members, projects, day, params] = await Promise.all([
    requireUser(),
    getTasks(),
    getMembers(),
    getProjects(),
    getDayContext(),
    searchParams,
  ]);
  const project = typeof params.project === "string" ? params.project : undefined;
  return (
    <Board
      // Remount when the URL's project changes so the filter follows the link.
      key={project ?? "all"}
      viewer={viewer}
      tasks={tasks}
      members={members}
      projects={projects}
      initialProject={project}
      day={day}
    />
  );
}
