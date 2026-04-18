"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";

export function NetworkTelemetry({ interceptMode = false, onIntercept }: { interceptMode?: boolean, onIntercept?: () => void }) {
  return (
    <GlassPanel className="p-0 h-full flex flex-col overflow-hidden">
      <div className="bg-ng-mid border-b border-ng-outline-dim/40 p-3 shrink-0 flex justify-between items-center">
        <h2 className="text-[12px] font-headline text-ng-muted uppercase tracking-widest">Network Telemetry</h2>
        {interceptMode && (
          <button onClick={onIntercept} className="text-[10px] bg-ng-cyan-bright/10 text-ng-cyan px-2 py-1 uppercase tracking-widest font-mono border border-ng-cyan/30 hover:bg-ng-cyan-bright/20">
            Intercept Traffic
          </button>
        )}
      </div>
      <div className="flex-1 p-0 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-[11px] font-mono">
          <thead className="bg-ng-base border-b border-ng-outline-dim/40 sticky top-0">
            <tr>
              <th className="font-normal text-ng-muted p-2">TIME</th>
              <th className="font-normal text-ng-muted p-2">PROTO</th>
              <th className="font-normal text-ng-muted p-2">DESTINATION</th>
              <th className="font-normal text-ng-muted p-2">STATE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ng-outline-dim/20">
              <td className="p-2 text-ng-muted">14:02:01</td>
              <td className="p-2 text-ng-cyan">DNS</td>
              <td className="p-2 text-ng-on">evilcorp.net</td>
              <td className="p-2"><NeonBadge label="RESOLVED" variant="cyan" /></td>
            </tr>
            <tr className="border-b border-ng-outline-dim/20 bg-ng-error/10">
              <td className="p-2 text-ng-muted">14:02:02</td>
              <td className="p-2 text-ng-error">HTTPS</td>
              <td className="p-2 text-ng-on">192.168.1.100:443</td>
              <td className="p-2"><NeonBadge label="BLOCKED" variant="error" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
