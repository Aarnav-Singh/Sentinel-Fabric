"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

export function TrafficInterceptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassPanel className="w-full max-w-2xl bg-ng-base/90 p-6 shadow-2xl ng-glow-magenta max-h-full flex flex-col" accent="magenta">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold text-ng-on text-shadow-cyan uppercase tracking-widest">Intercept Traffic</h2>
          <button onClick={onClose} className="text-ng-muted hover:text-ng-on">×</button>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar bg-ng-mid border border-ng-outline-dim/40 p-4 font-mono text-[11px] text-ng-on mb-6">
          <p className="text-ng-magenta mb-2"># Intercepted Payload (HTTP POST)</p>
          <pre className="whitespace-pre-wrap text-ng-muted">
{`POST /api/checkin HTTP/1.1
Host: evilcorp.net
User-Agent: Mozilla/5.0
Content-Type: application/x-www-form-urlencoded

id=machine-123&os=win10&priv=admin&data=base64encoded...`}
          </pre>
        </div>

        <div className="flex gap-4 justify-end">
          <NeonButton variant="secondary" onClick={onClose}>Drop Packet</NeonButton>
          <NeonButton variant="primary" onClick={onClose} className="ng-glow-cyan">Modify & Forward</NeonButton>
        </div>
      </GlassPanel>
    </div>
  );
}
