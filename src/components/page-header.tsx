import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
