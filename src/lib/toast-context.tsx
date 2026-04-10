"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, ShoppingBag, X } from "lucide-react";
import { cn } from "./utils";

type ToastTone = "success" | "info";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextType {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = "success", ...toast }: ToastInput) => {
      const id = nextIdRef.current++;

      setToasts((current) => [...current.slice(-2), { ...toast, tone, id }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 2600);
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextType>(
    () => ({
      showToast,
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toast.tone === "success" ? CheckCircle2 : Info;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-2xl border backdrop-blur-xl",
                  toast.tone === "success"
                    ? "border-vivid-blue/20 bg-[#10122a]/95"
                    : "border-white/[0.08] bg-[#14162f]/95"
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      toast.tone === "success"
                        ? "bg-vivid-blue/15 text-vivid-blue"
                        : "bg-white/[0.06] text-light-grey"
                    )}
                  >
                    {toast.tone === "success" ? (
                      <ShoppingBag className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted">{toast.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-lg p-1 text-muted/60 transition-colors hover:bg-white/[0.05] hover:text-white"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
