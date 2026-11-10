"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./modal";

type Tone = "info" | "success" | "error" | "danger";

type DialogOptions = {
  title: string;
  message?: ReactNode;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogRequest = DialogOptions & {
  id: number;
  kind: "alert" | "confirm";
  resolve: (value: boolean) => void;
};

type DialogApi = {
  /** Shows a message with a single OK button. Resolves when dismissed. */
  alert: (options: DialogOptions) => Promise<void>;
  /** Asks the user to confirm. Resolves true if confirmed, false otherwise. */
  confirm: (options: DialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  // A queue, so a second message never replaces one the user hasn't seen yet.
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const nextId = useRef(0);

  const open = useCallback(
    (kind: DialogRequest["kind"], options: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((q) => [...q, { ...options, id: nextId.current++, kind, resolve }]);
      }),
    [],
  );

  const api = useMemo<DialogApi>(
    () => ({
      alert: (options) => open("alert", options).then(() => undefined),
      confirm: (options) => open("confirm", options),
    }),
    [open],
  );

  const current = queue[0];
  const close = useCallback(
    (value: boolean) => {
      current?.resolve(value);
      setQueue((q) => q.slice(1));
    },
    [current],
  );

  return (
    <DialogContext value={api}>
      {children}
      {current && <MessageDialog key={current.id} request={current} onClose={close} />}
    </DialogContext>
  );
}

const TONE: Record<Tone, { icon: typeof Info; iconClass: string; button: string }> = {
  info: { icon: Info, iconClass: "bg-indigo-50 text-indigo-600", button: buttonClass.primary },
  success: { icon: CheckCircle2, iconClass: "bg-emerald-50 text-emerald-600", button: buttonClass.primary },
  error: { icon: AlertCircle, iconClass: "bg-red-50 text-red-600", button: buttonClass.primary },
  danger: {
    icon: AlertTriangle,
    iconClass: "bg-red-50 text-red-600",
    button:
      "inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-red-500 disabled:opacity-60",
  },
};

function MessageDialog({
  request,
  onClose,
}: {
  request: DialogRequest;
  onClose: (value: boolean) => void;
}) {
  const { kind, title, message, tone = kind === "confirm" ? "danger" : "info" } = request;
  const { icon: Icon, iconClass, button } = TONE[tone];
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the main action, and give focus back to whatever had it before.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    // Stop keys here so a modal underneath (e.g. the task editor) doesn't also react.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onClose(false);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const items = panelRef.current?.querySelectorAll<HTMLElement>("button");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role={kind === "confirm" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="message-dialog-title"
        aria-describedby={message ? "message-dialog-body" : undefined}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl ring-1 ring-zinc-200"
      >
        <div className="flex gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-1">
            <h2 id="message-dialog-title" className="text-sm font-semibold text-zinc-900">
              {title}
            </h2>
            {message && (
              <div id="message-dialog-body" className="mt-1.5 text-sm text-zinc-600">
                {message}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {kind === "confirm" && (
            <button type="button" onClick={() => onClose(false)} className={buttonClass.secondary}>
              {request.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button ref={confirmRef} type="button" onClick={() => onClose(true)} className={button}>
            {request.confirmLabel ?? (kind === "confirm" ? "Confirm" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
