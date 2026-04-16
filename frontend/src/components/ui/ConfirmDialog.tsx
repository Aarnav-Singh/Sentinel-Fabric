"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  dangerous = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.div
            className="w-full max-w-md bg-[var(--sf-surface)] border border-white/10 rounded-none shadow-2xl flex flex-col relative"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className={`p-6 border-b border-white/10 flex items-center justify-between rounded-t-2xl ${dangerous ? 'border-t-2 border-t-sf-critical' : ''}`}>
              <div className="flex items-center gap-3">
                {dangerous && (
                  <div className="w-10 h-10 rounded-none bg-sf-critical/10 border border-sf-critical/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-sf-critical" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold tracking-wide text-sf-text">{title}</h2>
                </div>
              </div>
              <button onClick={onCancel} className="p-2 text-sf-muted hover:text-white hover:bg-white/5 rounded-none transition-colors">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-6 text-sm text-sf-muted font-medium leading-relaxed">
              {message}
            </div>

            <footer className="p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/5 rounded-b-2xl">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant={dangerous ? "danger" : "primary"} onClick={() => { onConfirm(); onCancel(); }}>
                {confirmLabel}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
