"use client";

import React from 'react';
import useSWR from 'swr';
import { AlertCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function IncidentsPage() {
  const { data, isLoading } = useSWR('/api/proxy/api/v1/posture/remediation', fetcher, { refreshInterval: 30000 });
  const findings = data?.findings ?? [];

  return (
    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-sf-accent drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
            <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">Active Incidents</h2>
                <p className="text-sf-muted text-sm">Automated remediation tracking</p>
            </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-sf-surface/60 h-64 rounded-xl" />
        ) : (
          <div className="space-y-4">
            {findings.map((f: any) => (
              <div key={f.id} className="bg-sf-surface/70 border border-sf-accent/20 p-5 rounded-xl flex items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <AlertCircle className={`w-6 h-6 mt-0.5 flex-shrink-0 ${f.severity === 'critical' ? 'text-red-500 filter drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'text-orange-500 filter drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]'}`} />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-200 text-base">{f.title}</h3>
                  <p className="text-sf-muted text-sm mt-1">{f.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] uppercase bg-sf-bg px-2 py-1 rounded text-sf-accent border border-sf-accent/20 font-mono tracking-wider">{f.id}</span>
                    <span className="text-[10px] uppercase bg-sf-bg px-2 py-1 rounded text-sf-muted border border-sf-border/50 font-mono tracking-wider">Effort: {f.effort}</span>
                    <span className="text-[10px] uppercase bg-sf-bg px-2 py-1 rounded text-sf-muted border border-sf-border/50 font-mono tracking-wider">Status: {f.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
            {findings.length === 0 && <p className="text-sf-muted text-sm italic">No active incidents.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
