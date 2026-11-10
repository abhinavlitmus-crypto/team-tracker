import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      title={name}
      style={{ backgroundColor: color }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        size === "sm" && "h-6 w-6 text-[10px]",
        size === "md" && "h-8 w-8 text-xs",
        size === "lg" && "h-11 w-11 text-sm",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function UnassignedAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      title="Unassigned"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
      )}
    >
      ?
    </span>
  );
}
