"use client";

import React from "react";
import { Zap, Play, CheckCircle, AlertTriangle } from "lucide-react";

import Link from "next/link";

export default function SoarPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Zap className="w-8 h-8 text-brand-accent" />
                        SOAR Actions
                    </h1>
                    <p className="text-slate-400 mt-2">Manage and execute automated security playbooks.</p>
                </div>
                <Link 
                    href="/soar/editor" 
                    className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-brand-dark px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-glow"
                >
                    <Zap className="w-4 h-4" />
                    Create Playbook
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { id: "pb-1", name: "Isolate Endpoint", status: "Active", description: "Blocks all network traffic except management interfaces." },
                    { id: "pb-2", name: "Reset User Credentials", status: "Active", description: "Forces immediate password reset and revokes sessions." },
                    { id: "pb-3", name: "Block IP on Firewall", status: "Draft", description: "Adds malicious IP to the global drop list." }
                ].map((action) => (
                    <div key={action.id} className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-white">{action.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${action.status === 'Active' ? 'bg-brand-success/10 text-brand-success border-brand-success/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/30'}`}>
                                {action.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 flex-1">{action.description}</p>
                        
                        <div className="pt-4 border-t border-brand-border flex justify-end gap-3">
                            <button className="px-4 py-2 border border-brand-border rounded hover:bg-brand-surface text-white text-xs transition-colors">
                                Edit
                            </button>
                            <button className="px-4 py-2 bg-brand-accent/10 border border-brand-accent/30 rounded text-brand-accent hover:bg-brand-accent hover:text-brand-dark font-medium flex items-center gap-2 text-xs transition-colors">
                                <Play className="w-3 h-3" /> Execute
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
