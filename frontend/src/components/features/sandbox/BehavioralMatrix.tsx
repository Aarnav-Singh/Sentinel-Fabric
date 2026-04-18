"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";

export function BehavioralMatrix() {
  return (
    <GlassPanel className="p-0 h-full flex flex-col overflow-hidden">
      <div className="bg-ng-mid border-b border-ng-outline-dim/40 p-3 shrink-0">
        <h2 className="text-[12px] font-headline text-ng-muted uppercase tracking-widest">Behavioral Matrix</h2>
      </div>
      <div className="flex-1 p-4 overflow-auto custom-scrollbar flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-ng-on text-shadow-cyan">Defense Evasion</span>
            <span className="text-ng-cyan">90%</span>
          </div>
          <div className="h-1 bg-ng-mid w-full">
            <div className="h-full bg-ng-cyan-bright" style={{ width: '90%' }}></div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-ng-on text-shadow-cyan">Execution</span>
            <span className="text-ng-magenta">75%</span>
          </div>
          <div className="h-1 bg-ng-mid w-full">
            <div className="h-full bg-ng-magenta" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-ng-on text-shadow-cyan">Privilege Escalation</span>
            <span className="text-ng-error">100%</span>
          </div>
          <div className="h-1 bg-ng-mid w-full">
            <div className="h-full bg-ng-error" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
