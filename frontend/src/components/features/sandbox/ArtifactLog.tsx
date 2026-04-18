"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";

export function ArtifactLog() {
  return (
    <GlassPanel className="p-0 h-full flex flex-col overflow-hidden">
      <div className="bg-ng-mid border-b border-ng-outline-dim/40 p-3 shrink-0">
        <h2 className="text-[12px] font-headline text-ng-muted uppercase tracking-widest">Artifact Log</h2>
      </div>
      <div className="flex-1 p-4 overflow-auto custom-scrollbar flex flex-col gap-2">
        <div className="flex items-center gap-3 border border-ng-outline-dim/40 p-2 bg-ng-base">
          <NeonBadge label="FILE" variant="cyan" />
          <span className="font-mono text-[11px] text-ng-on truncate">C:\Windows\System32\payload.dll</span>
        </div>
        <div className="flex items-center gap-3 border border-ng-outline-dim/40 p-2 bg-ng-base">
          <NeonBadge label="REGISTRY" variant="magenta" />
          <span className="font-mono text-[11px] text-ng-on truncate">HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run</span>
        </div>
      </div>
    </GlassPanel>
  );
}
