"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertOctagon } from "lucide-react";
import { useThreatState } from "@/contexts/ThreatStateContext";
import Link from "next/link";

export function ThreatStateBanner() {
  const { threatState, criticalCount } = useThreatState();
  const [dismissed, setDismissed] = useState(false);

  const visible = threatState === "incident" && !dismissed;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("banner-dismissed", "1");
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="overflow-hidden shrink-0"
        >
          <div className="h-9 flex items-center justify-between px-4 bg-[rgba(220,38,38,0.15)] border-b border-[rgba(220,38,38,0.4)]">
            <div className="flex items-center gap-2 text-sf-critical text-[11px] font-mono">
              <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />
              <span>ACTIVE INCIDENT</span>
              <span className="text-sf-muted">·</span>
              <span>{criticalCount} critical findings unresolved</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/incidents" className="text-sf-critical text-[10px] font-mono tracking-widest hover:underline">
                OPEN COMMAND VIEW →
              </Link>
              <button onClick={handleDismiss} className="text-sf-critical hover:text-sf-text">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
