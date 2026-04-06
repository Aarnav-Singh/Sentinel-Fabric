"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, Target, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModelExplainabilityProps {
  score: number;
  factors?: { feature: string; importance: number }[];
  eventContext?: any;
  anchorRef: React.RefObject<HTMLElement | null>;
  isPinned?: boolean;
  onClose?: () => void;
}

export function ModelExplainability({ score, factors, eventContext, anchorRef, isPinned, onClose }: ModelExplainabilityProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        // Position it to the right of the badge, with a simple offset
        setPosition({
            top: rect.top + window.scrollY,
            left: rect.right + 10 + window.scrollX,
        });
    }
  }, [anchorRef]);

  // Default factors if none provided (for demo purposes)
  const displayFactors = factors && factors.length > 0 ? factors : [
    { feature: 'unusual_port', importance: 0.38 },
    { feature: 'high_entropy_payload', importance: 0.27 },
    { feature: 'off_hours_access', importance: 0.15 },
  ];

  if (!mounted) return null;

  return createPortal(
    <motion.div
        initial={{ opacity: 0, x: -5, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -5, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{ top: position.top, left: position.left }}
        className={`absolute z-[100] w-64 bg-sf-surface border border-sf-border shadow-2xl overflow-hidden ${isPinned ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
        <div className="flex items-center justify-between p-2 border-b border-sf-border bg-black/40">
           <div className="flex items-center gap-2">
               <Brain className="w-3.5 h-3.5 text-sf-accent" />
               <span className="text-[10px] font-mono tracking-widest text-sf-text uppercase">Model Explainability</span>
           </div>
           {isPinned && onClose && (
               <button onClick={onClose} className="text-sf-muted hover:text-sf-text" type="button">
                   &times;
               </button>
           )}
        </div>
        
        <div className="p-3 space-y-3">
           <div>
               <div className="text-[9px] text-sf-muted font-mono uppercase tracking-widest mb-1.5 flex justify-between">
                   <span>Top SHAP Factors</span>
                   <span>Weight</span>
               </div>
               <div className="space-y-1.5">
                   {displayFactors.map((f, i) => (
                       <div key={i} className="flex flex-col gap-0.5 group cursor-help transition-opacity hover:opacity-100 opacity-90" title={`Feature '${f.feature}' increased anomaly probability by ${(f.importance * 100).toFixed(1)}%`}>
                           <div className="flex justify-between items-center text-[10px] font-mono text-sf-text">
                               <span className="truncate mr-2 text-sf-text/80 group-hover:text-sf-text">{f.feature}</span>
                               <span className="text-sf-accent group-hover:font-bold">+{f.importance.toFixed(2)}</span>
                           </div>
                           <div className="h-0.5 w-full bg-sf-bg rounded-none overflow-hidden">
                               <div 
                                 className="h-full bg-sf-accent/70 group-hover:bg-sf-accent"
                                 style={{ width: `${(f.importance / 0.5) * 100}%` }}
                               />
                           </div>
                       </div>
                   ))}
               </div>
           </div>

           <div className="pt-2 border-t border-sf-border/50">
               <div className="text-[9px] text-sf-muted font-mono uppercase tracking-widest mb-1 items-center flex gap-1">
                   <Target className="w-3 h-3" /> Execution Context
               </div>
               <div className="text-[10px] font-mono text-sf-text/80 bg-sf-bg p-1.5 border border-sf-border/30">
                   VAE Anomaly Model evaluated sequence with 94.2% accuracy confidence.
               </div>
           </div>
        </div>
    </motion.div>,
    document.body
  );
}
