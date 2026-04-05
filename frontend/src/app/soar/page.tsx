"use client";

import React from "react";
import { Zap, Play } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface PlaybookData {
    id: string;
    name: string;
    description?: string;
    status: string;
    nodes: any[];
}

interface PlaybooksResponse {
    status: string;
    data: PlaybookData[];
}

export default function SoarPage() {
    const { data, isLoading } = useSWR<PlaybooksResponse>(
        '/api/proxy/api/v1/soar/playbooks',
        fetcher,
        { refreshInterval: 10000 }
    );

    const playbooks = data?.data ?? [];

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Zap className="w-8 h-8 text-sf-accent" />
                        SOAR Actions
                    </h1>
                    <p className="text-sf-muted mt-2">Manage and execute automated security playbooks.</p>
                </div>
                <Link 
                    href="/soar/editor" 
                    className="flex items-center gap-2 bg-sf-accent hover:bg-sf-accent/90 text-sf-bg px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-glow"
                >
                    <Zap className="w-4 h-4" />
                    Create Playbook
                </Link>
            </header>

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-sf-surface border border-sf-border rounded-xl p-5 animate-pulse">
                            <div className="h-5 bg-sf-surface rounded w-3/4 mb-4" />
                            <div className="h-3 bg-sf-surface/70 rounded w-full mb-2" />
                            <div className="h-3 bg-sf-surface/70 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && playbooks.length === 0 && (
                <div className="text-center py-16 bg-sf-surface/50 rounded-xl border border-sf-border">
                    <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sf-muted text-sm font-medium">No playbooks configured</p>
                    <p className="text-sf-muted text-xs mt-1">Create your first playbook to get started.</p>
                </div>
            )}

            {!isLoading && playbooks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playbooks.map((action) => (
                        <div key={action.id} className="bg-sf-surface border border-sf-border rounded-xl p-5 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-mono tracking-widest uppercase text-white">{action.name}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${action.status === 'Active' ? 'bg-sf-safe/10 text-sf-safe border-sf-safe/30' : 'bg-slate-500/10 text-sf-muted border-slate-500/30'}`}>
                                    {action.status}
                                </span>
                            </div>
                            <p className="text-sm text-sf-muted mb-6 flex-1">{action.description}</p>
                            
                            <div className="pt-4 border-t border-sf-border flex justify-end gap-3">
                                <button className="px-4 py-2 border border-sf-border rounded hover:bg-sf-surface text-white text-xs transition-colors">
                                    Edit
                                </button>
                                <button className="px-4 py-2 bg-sf-accent/10 border border-sf-accent/30 rounded text-sf-accent hover:bg-sf-accent hover:text-sf-bg font-medium flex items-center gap-2 text-xs transition-colors">
                                    <Play className="w-3 h-3" /> Execute
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
