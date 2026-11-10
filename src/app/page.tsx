import { Suspense } from "react";
import { Board, BoardSkeleton } from "@/components/board/board";
import { PageHeader } from "@/components/page-header";
import { getDayContext, getMembers, getTasks } from "@/lib/data";

export default function BoardPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Board" description="Drag cards between columns to update their status." />
      <Suspense fallback={<BoardSkeleton />}>
        <BoardData />
      </Suspense>
    </div>
  );
}

async function BoardData() {
  const [tasks, members, day] = await Promise.all([getTasks(), getMembers(), getDayContext()]);
  return <Board tasks={tasks} members={members} day={day} />;
}
