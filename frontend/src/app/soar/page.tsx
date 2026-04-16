"use client";

import React from "react";
import { Zap, Play } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/Badge";

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
                    <h1 className="text-3xl font-bold font-mono text-white tracking-tight flex items-center gap-3">
                        <Zap className="w-8 h-8 text-sf-accent" />
                        SOAR Actions
                    </h1>
                    <p className="text-sf-muted mt-2">Manage and execute automated security playbooks.</p>
                </div>
                <Link 
                    href="/soar/editor" 
                    className="flex items-center gap-2 bg-sf-accent hover:bg-sf-accent/90 text-sf-bg px-4 py-2 rounded-none font-mono font-bold text-[10px] uppercase tracking-widest transition-colors shadow-glow"
                >
                    <Zap className="w-4 h-4" />
                    CREATE PLAYBOOK
                </Link>
            </header>

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-sf-surface border border-sf-border rounded-none p-5 animate-pulse">
                            <div className="h-5 bg-sf-surface rounded w-3/4 mb-4" />
                            <div className="h-3 bg-sf-surface/70 rounded w-full mb-2" />
                            <div className="h-3 bg-sf-surface/70 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && playbooks.length === 0 && (
                <div className="text-center py-16 bg-sf-surface/50 rounded-none border border-sf-border">
                    <Zap className="w-10 h-10 text-sf-muted mx-auto mb-3" />
                    <p className="text-sf-muted text-sm font-medium">No playbooks configured</p>
                    <p className="text-sf-muted text-xs mt-1">Create your first playbook to get started.</p>
                </div>
            )}

            {!isLoading && playbooks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playbooks.map((pb: any) => (
                        <div key={pb.id} className="sf-panel p-3 flex flex-col justify-between group h-full gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge label={pb.status === "Active" ? "ACTIVE" : "INACTIVE"} severity={pb.status === "Active" ? "info" : "low"} />
                                    <span className="text-[13px] text-sf-text font-medium truncate">{pb.name}</span>
                                </div>
                                <div className="text-[11px] text-sf-muted font-mono leading-relaxed line-clamp-3">{pb.description}</div>
                                {pb.last_run && (
                                    <div className="text-[10px] text-sf-muted mt-2 font-mono">
                                        Last run: {new Date(pb.last_run).toLocaleString()}
                                        {pb.success_rate !== undefined && <><span className="text-sf-border mx-1">·</span>Success rate: {pb.success_rate}%</>}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 w-full mt-auto">
                                <button className="flex-1 px-3 py-2 border border-sf-border rounded-none hover:bg-sf-surface text-sf-text text-[10px] font-mono uppercase tracking-widest transition-colors">
                                    EDIT
                                </button>
                                <button className="flex-[2] text-[10px] font-mono px-3 py-2 border border-sf-accent text-sf-accent hover:bg-sf-accent hover:text-sf-bg transition-colors shrink-0 flex items-center justify-center gap-2">
                                    <Play className="w-3 h-3" /> RUN NOW
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
