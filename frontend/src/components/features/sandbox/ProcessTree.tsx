"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";

export function ProcessTree() {
  return (
    <GlassPanel className="p-4 h-full flex flex-col pt-0 pl-0 pr-0 pb-0 overflow-hidden">
      <div className="bg-ng-mid border-b border-ng-outline-dim/40 p-3 shrink-0 flex justify-between items-center">
        <h2 className="text-[12px] font-headline text-ng-muted uppercase tracking-widest">Process Execution Tree</h2>
      </div>
      <div className="flex-1 p-4 font-mono text-[11px] text-ng-on overflow-auto custom-scrollbar flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-ng-muted">─</span> <NeonBadge label="PID: 1024" variant="muted" /> <span>explorer.exe</span>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <span className="text-ng-muted">└─</span> <NeonBadge label="PID: 2048" variant="cyan" /> <span className="text-ng-cyan">cmd.exe</span> <span className="text-ng-muted">/c payload.bat</span>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <span className="text-ng-muted">└─</span> <NeonBadge label="PID: 4096" variant="magenta" /> <span className="text-ng-magenta">powershell.exe</span> <span className="text-ng-muted">-enc JABTA...</span>
        </div>
        <div className="flex items-center gap-2 pl-12">
          <span className="text-ng-muted">└─</span> <NeonBadge label="PID: 8192" variant="error" /> <span className="text-ng-error">csrss.exe</span>
        </div>
      </div>
    </GlassPanel>
  );
}
