"use client";

import React, { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

export function RoleInitializationModal({ onClose }: { onClose?: () => void }) {
  const [role, setRole] = useState("analyst");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassPanel className="w-full max-w-md bg-ng-base/90 p-6 shadow-2xl flex flex-col" accent="cyan">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-headline font-bold text-ng-on text-shadow-cyan uppercase tracking-widest">Initialize Role</h2>
          {onClose && <button onClick={onClose} className="text-ng-muted hover:text-ng-on">×</button>}
        </div>
        
        <div className="flex flex-col gap-4 mb-6">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-ng-muted">Select Clearance Level</span>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-ng-mid border border-ng-outline-dim/40 text-ng-on text-[12px] font-mono p-2 focus:outline-none focus:border-ng-cyan/60 rounded-none w-full"
            >
              <option value="analyst">L1 Analyst</option>
              <option value="hunter">L2 Threat Hunter</option>
              <option value="ciso">CISO / Executive</option>
              <option value="admin">Platform Admin</option>
            </select>
          </label>

          <div className="bg-ng-mid border border-ng-outline-dim/40 p-4 flex flex-col gap-2">
            <h3 className="text-[10px] font-headline tracking-widest uppercase text-ng-cyan">Provisioned Access</h3>
            <ul className="text-[11px] font-mono text-ng-muted space-y-1">
              {role === "analyst" && (
                <>
                  <li>- Read-only Dashboard</li>
                  <li>- Acknowledge Alerts</li>
                  <li>- Send to Sandbox</li>
                </>
              )}
              {role === "hunter" && (
                <>
                  <li>- Advanced UQL Queries</li>
                  <li>- Write YARA rules</li>
                  <li>- Execute SOAR actions</li>
                </>
              )}
              {role === "ciso" && (
                <>
                  <li>- View Global KPI</li>
                  <li>- Compliance Reports</li>
                  <li>- Budget Analytics</li>
                </>
              )}
              {role === "admin" && (
                <>
                  <li>- Full System Access</li>
                  <li>- User Provisioning</li>
                  <li>- Agent Configurations</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="flex gap-4 justify-end border-t border-ng-outline-dim/40 pt-4">
          <NeonButton variant="muted" onClick={onClose}>Cancel</NeonButton>
          <NeonButton variant="primary">Provision Access</NeonButton>
        </div>
      </GlassPanel>
    </div>
  );
}
