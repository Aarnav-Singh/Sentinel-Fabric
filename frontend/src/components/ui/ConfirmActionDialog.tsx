"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ConfirmActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: string;
  description: string;
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH";
  body?: Record<string, unknown>;
  onSuccess?: () => void;
  variant?: "default" | "danger";
  allowComment?: boolean;
}

export function ConfirmActionDialog({
  isOpen,
  onClose,
  action,
  description,
  endpoint,
  method = "POST",
  body = {},
  onSuccess,
  variant = "default",
  allowComment = false,
}: ConfirmActionDialogProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ message: `${action} completed`, type: "success" });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ message: `${action} failed`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-[301] pointer-events-none"
          >
            <div className="sf-panel-elevated pointer-events-auto w-full max-w-md p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sf-text text-[13px] font-medium">{action}</span>
                <button onClick={onClose} className="text-sf-muted hover:text-sf-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sf-muted text-[12px] mb-4">{description}</p>
              {allowComment && (
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Optional comment…"
                  rows={3}
                  className="w-full bg-sf-bg border border-sf-border text-sf-text text-[12px] p-2 resize-none focus:outline-none focus:border-sf-border-active mb-4"
                />
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant={variant === "danger" ? "danger" : "primary"} onClick={handleConfirm} disabled={loading}>
                  {loading ? "…" : "Confirm"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
