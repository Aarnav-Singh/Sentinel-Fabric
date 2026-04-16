"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`flex items-start gap-3 p-4 rounded-none shadow-2xl border backdrop-blur-md pointer-events-auto min-w-[300px] max-w-sm ${
                t.variant === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                t.variant === "error" ? "bg-sf-critical/10 border-sf-critical/30 text-sf-critical" :
                t.variant === "warning" ? "bg-sf-warning/10 border-sf-warning/30 text-sf-warning" :
                "bg-[var(--sf-surface)] border-white/10 text-white"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.variant === "success" && <CheckCircle className="w-5 h-5" />}
                {t.variant === "error" && <AlertCircle className="w-5 h-5" />}
                {t.variant === "warning" && <AlertTriangle className="w-5 h-5" />}
                {t.variant === "info" && <Info className="w-5 h-5 text-sf-muted" />}
              </div>
              <div className="flex-1 text-sm font-medium">{t.message}</div>
              <button 
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-sf-muted hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
