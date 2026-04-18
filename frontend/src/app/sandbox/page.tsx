"use client";

import React, { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ProcessTree } from "@/components/features/sandbox/ProcessTree";
import { NetworkTelemetry } from "@/components/features/sandbox/NetworkTelemetry";
import { BehavioralMatrix } from "@/components/features/sandbox/BehavioralMatrix";
import { ArtifactLog } from "@/components/features/sandbox/ArtifactLog";
import { TrafficInterceptModal } from "@/components/features/sandbox/TrafficInterceptModal";
import { NeonButton } from "@/components/ui/NeonButton";

export default function SandboxPage() {
  const [isInterceptModalOpen, setInterceptModalOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)] flex flex-col gap-4 overflow-hidden relative">
      {/* Header */}
      <GlassPanel className="p-4 shrink-0 flex justify-between items-center bg-ng-base/80 backdrop-blur">
        <div>
          <h1 className="text-2xl font-headline font-bold text-ng-on uppercase tracking-widest text-shadow-cyan">Sandbox Execution</h1>
          <p className="text-[11px] font-mono text-ng-muted mt-1 uppercase tracking-widest">Isolated Environment Analysis</p>
        </div>
        <NeonButton variant="primary">Detonate File</NeonButton>
      </GlassPanel>

      {/* Grid Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-0">
            <ProcessTree />
          </div>
          <div className="h-64 shrink-0">
            <NetworkTelemetry interceptMode={true} onIntercept={() => setInterceptModalOpen(true)} />
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-0">
            <BehavioralMatrix />
          </div>
          <div className="flex-1 min-h-0">
            <ArtifactLog />
          </div>
        </div>
      </div>

      {isInterceptModalOpen && <TrafficInterceptModal onClose={() => setInterceptModalOpen(false)} />}
    </div>
  );
}
