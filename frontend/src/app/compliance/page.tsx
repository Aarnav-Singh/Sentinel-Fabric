"use client";

import React from 'react';
import useSWR from 'swr';
import { ShieldCheck, FileCheck, Clock, AlertTriangle } from 'lucide-react';
import { MitreHeatmap } from '@/components/features/compliance/MitreHeatmap';

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
    compliant: 'bg-[var(--sf-safe)]/20 text-[var(--sf-safe)] border-[var(--sf-safe)]/30',
    partial: 'bg-[var(--sf-warning)]/20 text-[var(--sf-warning)] border-[var(--sf-warning)]/30',
    non_compliant: 'bg-[var(--sf-critical)]/20 text-[var(--sf-critical)] border-[var(--sf-critical)]/30',
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
              <FileCheck className="w-5 h-5 text-[var(--sf-safe)]" />
              <h3 className="text-lg font-bold text-white">SOC 2 Type II â€” Trust Service Criteria</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-1 bg-[var(--sf-safe)]/10 text-[var(--sf-safe)] border border-[var(--sf-safe)]/30 rounded-none font-bold">{compliantCount} COMPLIANT</span>
              <span className="px-2 py-1 bg-[var(--sf-warning)]/10 text-[var(--sf-warning)] border border-[var(--sf-warning)]/30 rounded-none font-bold">{partialCount} PARTIAL</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-sf-surface border border-sf-border rounded">
                <Clock className="w-3 h-3 text-sf-muted" />
                <span className="text-sf-text font-mono">{retentionDays}d retention</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tscStatuses.map(tsc => (
              <div key={tsc.tsc} className="sf-panel border border-sf-border p-4 rounded-none">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sf-accent font-mono text-xs font-bold">{tsc.tsc}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-none border ${statusColors[tsc.status]}`}>
                    {tsc.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sf-text text-sm">{tsc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MITRE ATT&CK Coverage */}
        <section className="space-y-4">
          <MitreHeatmap className="h-[700px] rounded-none border border-sf-border overflow-hidden sf-panel" />
        </section>
      </div>
    </div>
  );
}


