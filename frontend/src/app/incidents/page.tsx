"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function IncidentsPage() {
 const { data, isLoading } = useSWR('/api/proxy/api/v1/findings?status=escalated', fetcher, { refreshInterval: 30000 });
 const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
 const incidents = data?.findings ?? [];

 return (
 <div className="flex-1 p-6 overflow-auto custom-scrollbar">
 <div className="max-w-7xl mx-auto space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-ng-outline-dim/40 pb-4 gap-4">
 <div className="flex items-center gap-3">
 <AlertCircle className="w-8 h-8 text-ng-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
 <div>
 <h2 className="font-headline tracking-widest uppercase text-2xl font-bold text-ng-on text-shadow-cyan">Incidents</h2>
 <p className="text-ng-muted text-sm">Automated remediation tracking</p>
 </div>
 </div>
 <div className="flex gap-4">
 <button 
 className={`text-[10px] font-mono tracking-widest uppercase pb-4 mb-[-17px] transition-colors border-b-2 ${activeTab === 'active' ? 'border-ng-cyan/50 text-ng-on font-bold' : 'border-transparent text-ng-muted hover:text-ng-on'}`}
 onClick={() => setActiveTab('active')}
 >
 ACTIVE
 </button>
 <button 
 className={`text-[10px] font-mono tracking-widest uppercase pb-4 mb-[-17px] transition-colors border-b-2 ${activeTab === 'archived' ? 'border-ng-cyan/50 text-ng-on font-bold' : 'border-transparent text-ng-muted hover:text-ng-on'}`}
 onClick={() => setActiveTab('archived')}
 >
 ARCHIVED
 </button>
 </div>
 </div>

 {isLoading ? (
 <div className="animate-pulse bg-ng-mid/60 h-64 rounded-none border border-ng-outline-dim/40" />
 ) : (
 <div className="relative pl-6">
 {/* Vertical line */}
 <div className="absolute left-2 top-0 bottom-0 w-px bg-ng-outline-dim/30" />
 {activeTab === 'active' ? (
 incidents.length > 0 ? incidents.map((inc: any) => (
 <div key={inc.id} className="relative mb-4 pl-4">
 {/* Timeline dot */}
 <div className={`absolute -left-[18px] w-2.5 h-2.5 border-2 bg-ng-base ${inc.severity === "critical" ? "border-ng-error" : inc.severity === "high" ? "border-ng-magenta" : "border-ng-outline-dim/40"}`} />

 <div className="ng-surface p-3 hover:border-ng-cyan/60 transition-colors cursor-pointer">
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <Badge label={inc.severity?.toUpperCase() || "UNKNOWN"} severity={inc.severity || "info"} />
 <span className="text-[12px] font-mono text-ng-muted">{inc.id?.slice(0, 12) || "INC-????"}</span>
 </div>
 <span className="text-[10px] font-mono text-ng-muted">{inc.created_at ? new Date(inc.created_at).toLocaleString() : "—"}</span>
 </div>
 <div className="text-[13px] text-ng-on">{inc.summary || inc.description || inc.title || "Security incident"}</div>
 {inc.assigned_to && (
 <div className="text-[10px] text-ng-muted mt-1">Assigned: {inc.assigned_to}</div>
 )}
 </div>
 </div>
 )) : <p className="text-ng-muted text-[10px] font-mono tracking-widest uppercase">NO ACTIVE INCIDENTS.</p>
 ) : (
 <p className="text-ng-muted text-[10px] font-mono tracking-widest uppercase">NO ARCHIVED INCIDENTS.</p>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
