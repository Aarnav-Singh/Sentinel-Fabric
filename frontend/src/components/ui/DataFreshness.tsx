"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DataFreshnessProps {
  lastUpdated?: number; // unix timestamp in ms
  refreshInterval?: number; // in seconds
  showProgressBar?: boolean;
}

export function DataFreshness({ lastUpdated, refreshInterval = 10, showProgressBar = false }: DataFreshnessProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffInSeconds = Math.floor((now - lastUpdated) / 1000);
      setSecondsAgo(Math.max(0, diffInSeconds));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const displayTime = lastUpdated ? `${secondsAgo}S AGO` : 'LIVE';
  
  // Progress bar countdown
  const progressPercent = lastUpdated ? Math.max(0, 100 - (secondsAgo / refreshInterval) * 100) : 100;

  // Color mapping based on staleness
  let stateColor = 'bg-sf-safe';
  if (lastUpdated) {
     if (secondsAgo > refreshInterval * 2) stateColor = 'bg-sf-critical';
     else if (secondsAgo > refreshInterval * 0.8) stateColor = 'bg-sf-warning';
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-[70px]">
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[9px] font-mono tracking-widest uppercase text-sf-muted">
          {displayTime}
        </span>
        <motion.span 
          animate={{ opacity: [1, 0.4, 1] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`w-1.5 h-1.5 ${stateColor}/80 rounded-full border border-black/50`}
        />
      </div>
      {showProgressBar && (
        <div className="h-[1px] w-full bg-sf-surface/80">
          <motion.div 
            className={`h-full ${stateColor}/70`}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "linear", duration: 1 }}
          />
        </div>
      )}
    </div>
  );
}
