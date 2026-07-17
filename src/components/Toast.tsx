import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; type: ToastType; message: string }

const ToastCtx = createContext<(t: { type: ToastType; message: string }) => void>(() => {});

export function useToast() {
  const fn = useContext(ToastCtx);
  if (!fn) throw new Error("useToast must be used within ToastProvider");
  return fn;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-card animate-slide-in min-w-[260px] max-w-sm",
                t.type === "success" && "border-accent-200",
                t.type === "error" && "border-rose-200",
                t.type === "info" && "border-brand-200",
              )}
            >
              {t.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent-600 shrink-0" />}
              {t.type === "error" && <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 shrink-0" />}
              {t.type === "info" && <Info className="mt-0.5 h-5 w-5 text-brand-600 shrink-0" />}
              <p className="flex-1 text-sm text-ink-800">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-ink-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
