"use client";

import React, { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonBadge } from "@/components/ui/NeonBadge";

export function AssetProvisioningFlow({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassPanel className="w-full max-w-xl bg-ng-base/90 p-6 shadow-2xl flex flex-col" accent="lime">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-headline font-bold text-ng-on uppercase tracking-widest">Asset Provisioning</h2>
            <NeonBadge label={`STEP ${step}/3`} variant="muted" />
          </div>
          {onClose && <button onClick={onClose} className="text-ng-muted hover:text-ng-on">×</button>}
        </div>
        
        {step === 1 && (
          <div className="flex flex-col gap-4 mb-6 h-48 overflow-auto">
            <p className="text-[11px] font-mono text-ng-muted">Connect a new external asset source to the UMBRIX unified pipeline.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-ng-outline-dim/40 p-4 hover:border-ng-cyan hover:bg-ng-mid cursor-pointer flex flex-col items-center justify-center transition-colors">
                <span className="text-ng-cyan font-bold tracking-widest uppercase text-sm">AWS</span>
                <span className="text-[9px] font-mono text-ng-muted mt-1">CloudTrail & GuardDuty</span>
              </div>
              <div className="border border-ng-outline-dim/40 p-4 hover:border-ng-cyan hover:bg-ng-mid cursor-pointer flex flex-col items-center justify-center transition-colors">
                <span className="text-ng-cyan font-bold tracking-widest uppercase text-sm">CrowdStrike</span>
                <span className="text-[9px] font-mono text-ng-muted mt-1">FDR Streaming</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 mb-6 h-48">
            <p className="text-[11px] font-mono text-ng-muted">Configure connection credentials.</p>
            <input type="text" placeholder="API Key" className="bg-ng-base border border-ng-outline-dim/40 text-[11px] font-mono p-2 text-ng-on focus:outline-none focus:border-ng-cyan" />
            <input type="password" placeholder="Secret Token" className="bg-ng-base border border-ng-outline-dim/40 text-[11px] font-mono p-2 text-ng-on focus:outline-none focus:border-ng-cyan" />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 mb-6 h-48 items-center justify-center text-center">
            <div className="w-12 h-12 border-2 border-ng-lime border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[12px] font-mono tracking-widest text-ng-lime uppercase">Validating Connection...</p>
          </div>
        )}

        <div className="flex gap-4 justify-between border-t border-ng-outline-dim/40 pt-4">
          <NeonButton variant="muted" onClick={() => step > 1 ? setStep(step - 1) : onClose?.()}>
            {step === 1 ? 'Cancel' : 'Back'}
          </NeonButton>
          <NeonButton variant={step === 3 ? "muted" : "primary"} onClick={() => step < 3 && setStep(step + 1)}>
            {step === 3 ? 'Connecting...' : 'Next'}
          </NeonButton>
        </div>
      </GlassPanel>
    </div>
  );
}
