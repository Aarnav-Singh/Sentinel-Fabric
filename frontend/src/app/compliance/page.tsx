"use client";

import React from 'react';
import useSWR from 'swr';
import { ShieldCheck, FileCheck, Clock, AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TscStatus {
  tsc: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  last_audit?: string;
}

export default function CompliancePage() {
  const { data: coverageData, isLoading: coverageLoading } = useSWR('/api/proxy/api/v1/posture/coverage', fetcher, { refreshInterval: 60000 });
  const { data: complianceData, isLoading: complianceLoading } = useSWR('/api/proxy/api/v1/compliance/status', fetcher, { refreshInterval: 60000 });

  const tactics = coverageData?.tactics ?? [];
  const tscStatuses: TscStatus[] = complianceData?.tsc_statuses ?? [
    { tsc: 'CC6.1', description: 'Logical Access Controls', status: 'compliant' },
    { tsc: 'CC6.2', description: 'Credentials Management', status: 'compliant' },
    { tsc: 'CC6.3', description: 'Access Revocation', status: 'partial' },
    { tsc: 'CC7.1', description: 'Vulnerability Management', status: 'compliant' },
    { tsc: 'CC7.2', description: 'Incident Detection & Response', status: 'compliant' },
    { tsc: 'CC7.3', description: 'Incident Recovery', status: 'partial' },
    { tsc: 'CC8.1', description: 'Change Management', status: 'compliant' },
    { tsc: 'A1.1', description: 'Data Availability Controls', status: 'compliant' },
    { tsc: 'A1.2', description: 'Environmental Safety', status: 'non_compliant' },
  ];
  const retentionDays = complianceData?.retention_days ?? 2555;

  const statusColors = {
    compliant: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    non_compliant: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const compliantCount = tscStatuses.filter(t => t.status === 'compliant').length;
  const partialCount = tscStatuses.filter(t => t.status === 'partial').length;

  return (
    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-sf-accent drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
          <div>
            <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">Compliance & Audit</h2>
            <p className="text-sf-muted text-sm">SOC 2 Type II audit trail + MITRE ATT&CK coverage</p>
          </div>
        </div>

        {/* SOC 2 Compliance Status (Phase 27/34) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">SOC 2 Type II — Trust Service Criteria</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-bold">{compliantCount} COMPLIANT</span>
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded font-bold">{partialCount} PARTIAL</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-sf-surface border border-sf-border rounded">
                <Clock className="w-3 h-3 text-sf-muted" />
                <span className="text-slate-300 font-mono">{retentionDays}d retention</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tscStatuses.map(tsc => (
              <div key={tsc.tsc} className="bg-sf-surface/70 border border-sf-accent/10 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sf-accent font-mono text-xs font-bold">{tsc.tsc}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusColors[tsc.status]}`}>
                    {tsc.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-300 text-sm">{tsc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MITRE ATT&CK Coverage (existing) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">MITRE ATT&CK Coverage</h3>
          </div>

          {coverageLoading ? (
            <div className="animate-pulse bg-sf-surface/60 h-64 rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-wrap">
              {tactics.length === 0 ? (
                <div className="col-span-1 md:col-span-2 text-center py-12 border border-dashed border-sf-border bg-sf-surface/50 text-sf-muted">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30 text-sf-text" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">NO ATT&CK DATA AVAILABLE — RUN A COMPLIANCE SCAN TO GENERATE.</p>
                </div>
              ) : tactics.map((tactic: any) => (
                <div key={tactic.tactic} className="bg-sf-surface/70 border border-sf-accent/20 p-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  <h3 className="font-bold text-slate-300 mb-3 tracking-widest text-xs uppercase text-sf-accent/80">{tactic.tactic}</h3>
                  <ul className="space-y-2">
                    {tactic.techniques.map((tech: any) => (
                      <li key={tech.id} className="flex justify-between items-center text-sm p-2 bg-sf-bg/60 border border-sf-accent/10 rounded">
                        <div>
                          <span className="text-sf-muted font-mono mr-2 text-[11px]">{tech.id}</span>
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
        </section>
      </div>
    </div>
  );
}

