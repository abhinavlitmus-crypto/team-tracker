import { Suspense } from "react";
import type { Metadata } from "next";
import { MyTasks } from "@/components/my-tasks";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getDayContext, getMembers, getProjects, getTasks } from "@/lib/data";

export const metadata: Metadata = { title: "My tasks" };

export default function MyTasksPage() {
  return (
    <>
      <PageHeader title="My tasks" description="Everything assigned to you. Change a status as you make progress." />
      <Suspense fallback={<ListSkeleton />}>
        <MyTasksData />
      </Suspense>
    </>
  );
}

async function MyTasksData() {
  const [viewer, tasks, members, projects, day] = await Promise.all([
    requireUser(),
    getTasks(),
    getMembers(),
    getProjects(),
    getDayContext(),
  ]);
  const mine = tasks.filter((t) => t.assigneeId === viewer.id);
  return <MyTasks viewer={viewer} tasks={mine} members={members} projects={projects} day={day} />;
}

function ListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6" aria-hidden>
      <div className="h-20 animate-pulse rounded-xl bg-zinc-200/60" />
      <div className="h-48 animate-pulse rounded-xl bg-zinc-200/60" />
    </div>
  );
}
