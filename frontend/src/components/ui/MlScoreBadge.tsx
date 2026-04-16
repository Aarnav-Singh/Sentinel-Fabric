"use client";

import React, { useState, useRef } from 'react';
import { ModelExplainability } from '@/components/features/investigation/ModelExplainability';
import { AnimatePresence } from 'framer-motion';

interface MlScoreBadgeProps {
  score: number;
  factors?: { feature: string; importance: number }[];
  eventContext?: any;
  modelLabel?: string;
}

export function MlScoreBadge({ score, factors, eventContext, modelLabel }: MlScoreBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  
  // Normalize score between 0 and 1
  const normalizedScore = Math.min(Math.max(score, 0), 1);
  const percentage = Math.round(normalizedScore * 100);
  
  let colorClass = 'bg-sf-safe/80';
  let badgeColorClass = 'text-sf-safe';
  
  if (normalizedScore > 0.7) {
    colorClass = 'bg-sf-critical/80';
    badgeColorClass = 'text-sf-critical';
  } else if (normalizedScore > 0.4) {
    colorClass = 'bg-sf-warning/80';
    badgeColorClass = 'text-sf-warning';
  }

  return (
    <div 
      className="relative inline-flex items-center gap-2 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
          e.stopPropagation();
          setIsPinned(prev => !prev);
      }}
      ref={badgeRef}
    >
      <div className="flex flex-col gap-0.5 w-14 cursor-pointer">
        {modelLabel && (
          <div className="text-[7px] font-mono text-sf-muted uppercase tracking-widest text-right leading-none">{modelLabel}</div>
        )}
        <div className="flex items-center gap-1.5">
            <div className="h-1.5 flex-1 bg-sf-surface border border-sf-border overflow-hidden rounded-[1px]">
               <div 
                 className={`h-full ${colorClass} transition-all duration-500 ease-out`}
                 style={{ width: `${percentage}%` }}
               />
            </div>
            <div className={`text-[9px] font-mono font-bold w-6 text-right cursor-pointer ${badgeColorClass} leading-none`}>
               {percentage}%
            </div>
        </div>
      </div>

      <AnimatePresence>
        {(isHovered || isPinned) && (
          <ModelExplainability 
            score={score} 
            factors={factors}
            eventContext={eventContext}
            anchorRef={badgeRef}
            isPinned={isPinned}
            onClose={() => setIsPinned(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
