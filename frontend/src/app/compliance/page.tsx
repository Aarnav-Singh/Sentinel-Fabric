"use client";

import React from 'react';
import useSWR from 'swr';
import { ShieldCheck } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function CompliancePage() {
  const { data: coverageData, isLoading } = useSWR('/api/proxy/api/v1/posture/coverage', fetcher, { refreshInterval: 60000 });
  const tactics = coverageData?.tactics ?? [];

  return (
    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-brand-accent drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
            <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">Compliance & Mapping</h2>
                <p className="text-slate-400 text-sm">MITRE ATT&CK coverage tracking</p>
            </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-slate-800/60 h-64 rounded-xl" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-wrap">
            {tactics.map((tactic: any) => (
              <div key={tactic.tactic} className="bg-brand-card/70 border border-brand-accent/20 p-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <h3 className="font-bold text-slate-300 mb-3 tracking-widest text-xs uppercase text-brand-accent/80">{tactic.tactic}</h3>
                <ul className="space-y-2">
                  {tactic.techniques.map((tech: any) => (
                    <li key={tech.id} className="flex justify-between items-center text-sm p-2 bg-brand-dark/60 border border-brand-accent/10 rounded">
                      <div>
                        <span className="text-slate-500 font-mono mr-2 text-[11px]">{tech.id}</span>
                        <span className="text-slate-200">{tech.name}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${tech.coverage === 'covered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : tech.coverage === 'partial' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {tech.coverage}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
