"use client";

import React, { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

export function AutomatedResponseConfig({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassPanel className="w-full max-w-2xl bg-ng-base/90 p-6 shadow-2xl flex flex-col" accent="magenta">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold text-ng-on text-shadow-magenta uppercase tracking-widest">Automated Response Playbook</h2>
          {onClose && <button onClick={onClose} className="text-ng-muted hover:text-ng-on">×</button>}
        </div>
        
        <div className="flex flex-col gap-4 mb-6">
          <p className="text-[11px] font-mono text-ng-muted border-b border-ng-outline-dim/40 pb-2">Define condition-action pipelines for autonomous threat mitigation.</p>
          
          <div className="bg-ng-mid border border-ng-outline-dim/40 p-4">
            <h3 className="text-[10px] font-headline text-ng-cyan uppercase tracking-widest mb-2">Trigger Condition</h3>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-ng-muted">IF</span>
              <select className="bg-ng-base border border-ng-outline-dim/40 text-ng-on px-2 py-1">
                <option>Severity == Critical</option>
                <option>Tactic == Lateral Movement</option>
                <option>ML Confidence &gt; 95%</option>
              </select>
              <span className="text-ng-muted">AND</span>
              <select className="bg-ng-base border border-ng-outline-dim/40 text-ng-on px-2 py-1">
                <option>Asset.IsCrownJewel == True</option>
                <option>Network.Zone == Production</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-2 z-10 w-full relative">
            <div className="w-px h-8 bg-ng-cyan absolute top-0 -mt-2"></div>
            <div className="text-[10px] font-mono text-ng-cyan bg-ng-base border border-ng-cyan/30 px-2 z-10 my-2">THEN EXECUTE</div>
            <div className="w-px h-8 bg-ng-cyan absolute bottom-0 -mb-2"></div>
          </div>

          <div className="bg-ng-mid border border-ng-outline-dim/40 p-4">
            <h3 className="text-[10px] font-headline text-ng-magenta uppercase tracking-widest mb-2">SOAR Actions</h3>
            <div className="flex gap-2 flex-wrap">
              <div className="border border-ng-magenta/40 text-ng-magenta text-[10px] font-mono px-3 py-1 bg-ng-magenta/10 uppercase">Halt Process Tree</div>
              <div className="border border-ng-magenta/40 text-ng-magenta text-[10px] font-mono px-3 py-1 bg-ng-magenta/10 uppercase">Isolate Host</div>
              <div className="border border-ng-magenta/40 text-ng-magenta text-[10px] font-mono px-3 py-1 bg-ng-magenta/10 uppercase opacity-50 border-dashed hover:opacity-100 cursor-pointer">+ Add Action</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-between border-t border-ng-outline-dim/40 pt-4">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <input type="checkbox" id="require_approval" className="accent-ng-cyan" defaultChecked />
            <label htmlFor="require_approval" className="text-ng-muted">Require Human Approval</label>
          </div>
          <div className="flex gap-4">
            <NeonButton variant="muted" onClick={onClose}>Cancel</NeonButton>
            <NeonButton variant="primary">Deploy Playbook</NeonButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
