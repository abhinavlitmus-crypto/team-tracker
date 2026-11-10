"use client";

import {
  useMemo,
  useOptimistic,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import type { Priority, TaskStatus } from "@prisma/client";
import { moveTask } from "@/actions/tasks";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_DOT, STATUS_LABEL } from "@/lib/constants";
import { deadlineState } from "@/lib/dates";
import type { CurrentUser, DayContext, MemberDTO, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDialog } from "../dialog";
import { buttonClass, inputClass } from "../modal";
import { TaskCard } from "../task-card";
import { canUpdateStatus, TaskModal } from "../task-modal";

type Move = {
  taskId: string;
  status: TaskStatus;
  beforeTaskId: string | null;
  afterTaskId: string | null;
};

/** Mirrors the server's placement logic so the board updates instantly on drop. */
function applyMove(tasks: TaskDTO[], move: Move): TaskDTO[] {
  const moving = tasks.find((t) => t.id === move.taskId);
  if (!moving) return tasks;

  const column = tasks
    .filter((t) => t.status === move.status && t.id !== move.taskId)
    .sort((a, b) => a.position - b.position);

  let index = column.length;
  const beforeIdx = column.findIndex((t) => t.id === move.beforeTaskId);
  const afterIdx = column.findIndex((t) => t.id === move.afterTaskId);
  if (beforeIdx !== -1) index = beforeIdx;
  else if (afterIdx !== -1) index = afterIdx + 1;

  const updated: TaskDTO = { ...moving, status: move.status };
  column.splice(index, 0, updated);
  const positions = new Map(column.map((t, i) => [t.id, i]));

  return tasks.map((t) =>
    t.id === move.taskId
      ? { ...updated, position: positions.get(t.id)! }
      : positions.has(t.id)
        ? { ...t, position: positions.get(t.id)! }
        : t,
  );
}

// Render the drag-and-drop board only in the browser so its generated
// attributes can never mismatch the server HTML during hydration.
const subscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

type AssigneeFilter = "ALL" | "UNASSIGNED" | string;

export function Board({
  viewer,
  tasks,
  members,
  day,
}: {
  viewer: CurrentUser;
  tasks: TaskDTO[];
  members: MemberDTO[];
  day: DayContext;
}) {
  const isAdmin = viewer.access === "ADMIN";
  // Members start on their own tasks; admins see the whole team.
  const defaultAssignee: AssigneeFilter = isAdmin ? "ALL" : viewer.id;
  const isClient = useIsClient();
  const [optimisticTasks, addMove] = useOptimistic(tasks, applyMove);
  const [, startTransition] = useTransition();
  const dialog = useDialog();

  const [assignee, setAssignee] = useState<AssigneeFilter>(defaultAssignee);
  const [priority, setPriority] = useState<Priority | "ALL">("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [query, setQuery] = useState("");

  const [modal, setModal] = useState<
    { mode: "create"; status: TaskStatus } | { mode: "edit"; task: TaskDTO } | null
  >(null);

  const filtersActive = assignee !== defaultAssignee || priority !== "ALL" || overdueOnly || query !== "";

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = optimisticTasks.filter((t) => {
      if (assignee === "UNASSIGNED" && t.assigneeId) return false;
      if (assignee !== "ALL" && assignee !== "UNASSIGNED" && t.assigneeId !== assignee) return false;
      if (priority !== "ALL" && t.priority !== priority) return false;
      if (overdueOnly && (t.status === "DONE" || deadlineState(t.dueDate, day.today, day.weekEnd) !== "overdue"))
        return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
      return true;
    });
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, [] as TaskDTO[]])) as Record<
      TaskStatus,
      TaskDTO[]
    >;
    for (const t of visible) byStatus[t.status].push(t);
    for (const s of STATUSES) byStatus[s].sort((a, b) => a.position - b.position);
    return byStatus;
  }, [optimisticTasks, assignee, priority, overdueOnly, query, day]);

  const overdueCount = useMemo(
    () =>
      optimisticTasks.filter(
        (t) => t.status !== "DONE" && deadlineState(t.dueDate, day.today, day.weekEnd) === "overdue",
      ).length,
    [optimisticTasks, day],
  );

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const status = destination.droppableId as TaskStatus;
    const target = columns[status].filter((t) => t.id !== draggableId);
    const move: Move = {
      taskId: draggableId,
      status,
      beforeTaskId: target[destination.index]?.id ?? null,
      afterTaskId: target[destination.index - 1]?.id ?? null,
    };

    startTransition(async () => {
      addMove(move);
      const res = await moveTask(move);
      if (!res.ok) dialog.alert({ title: "Couldn't move task", message: res.message, tone: "error" });
    });
  }

  function clearFilters() {
    setAssignee(defaultAssignee);
    setPriority("ALL");
    setOverdueOnly(false);
    setQuery("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 sm:px-6">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className={cn(inputClass, "pl-8")}
          />
        </div>
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Filter by assignee"
          className={cn(inputClass, "w-auto")}
        >
          <option value="ALL">All assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === viewer.id ? `${m.name} (you)` : m.name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | "ALL")}
          aria-label="Filter by priority"
          className={cn(inputClass, "w-auto")}
        >
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOverdueOnly((v) => !v)}
          aria-pressed={overdueOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition",
            overdueOnly
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Overdue
          <span
            className={cn(
              "rounded-full px-1.5 text-[11px]",
              overdueCount ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-600",
            )}
          >
            {overdueCount}
          </span>
        </button>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        {isAdmin && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setModal({ mode: "create", status: "TODO" })}
              className={buttonClass.primary}
            >
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        )}
      </div>

      {/* Columns */}
      {isClient ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="scroll-thin flex min-h-0 flex-1 gap-3 overflow-x-auto p-4 sm:px-6">
            {STATUSES.map((status) => (
              <section
                key={status}
                className="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-zinc-100/80"
              >
                <header className="flex items-center justify-between px-3 pb-2 pt-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      {STATUS_LABEL[status]}
                    </h2>
                    <span className="rounded-full bg-zinc-200 px-1.5 text-[11px] font-medium text-zinc-600">
                      {columns[status].length}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setModal({ mode: "create", status })}
                      className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                      aria-label={`Add task to ${STATUS_LABEL[status]}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </header>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "scroll-thin min-h-24 flex-1 space-y-2 overflow-y-auto rounded-b-xl px-2 pb-2 transition-colors",
                        snapshot.isDraggingOver && "bg-indigo-50",
                      )}
                    >
                      {columns[status].map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                          isDragDisabled={!canUpdateStatus(viewer, task)}
                        >
                          {(drag, dragSnapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              onClick={() => setModal({ mode: "edit", task })}
                              className="cursor-pointer"
                            >
                              <TaskCard task={task} day={day} dragging={dragSnapshot.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columns[status].length === 0 && !snapshot.isDraggingOver && (
                        <p className="px-2 py-6 text-center text-xs text-zinc-400">
                          {filtersActive ? "No matching tasks" : "No tasks"}
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <BoardSkeleton />
      )}

      {modal && (
        <TaskModal
          key={modal.mode === "edit" ? modal.task.id : `new-${modal.status}`}
          viewer={viewer}
          members={members}
          task={modal.mode === "edit" ? modal.task : undefined}
          defaultStatus={modal.mode === "create" ? modal.status : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex flex-1 gap-3 overflow-hidden p-4 sm:px-6" aria-hidden>
      {STATUSES.map((s) => (
        <div key={s} className="w-72 shrink-0 space-y-2 rounded-xl bg-zinc-100/80 p-3">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="h-20 animate-pulse rounded-lg bg-white" />
          <div className="h-20 animate-pulse rounded-lg bg-white" />
        </div>
      ))}
    </div>
  );
}
