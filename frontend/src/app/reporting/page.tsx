"use client";

import React from "react";
import { FileText, Download, Filter, Calendar } from "lucide-react";

export default function ReportingPage() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-brand-accent" />
                        Reporting
                    </h1>
                    <p className="text-slate-400 mt-2">Generate and export security compliance and incident reports.</p>
                </div>
                <button className="px-4 py-2 bg-brand-accent text-brand-dark font-bold rounded hover:bg-brand-accent/90 transition-colors flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Generate New Report
                </button>
            </header>

            <div className="bg-brand-card border border-brand-border rounded-xl mb-6">
                <div className="p-4 border-b border-brand-border flex gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400 bg-brand-surface px-3 py-1.5 rounded border border-brand-border">
                        <Calendar className="w-4 h-4" />
                        Last 30 Days
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 bg-brand-surface px-3 py-1.5 rounded border border-brand-border">
                        <Filter className="w-4 h-4" />
                        All Types
                    </div>
                </div>
                
                <table className="w-full text-left text-sm">
                    <thead className="bg-brand-surface/50 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Report Name</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Date Generated</th>
                            <th className="px-6 py-4 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border text-slate-300">
                        {['Monthly Threat Summary', 'Compliance Audit Log', 'Suspicious Logins Report'].map((report, i) => (
                            <tr key={i} className="hover:bg-brand-surface/30 transition-colors">
                                <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    {report}
                                </td>
                                <td className="px-6 py-4">{i === 1 ? 'Compliance' : 'Security'}</td>
                                <td className="px-6 py-4 font-mono text-xs">{new Date(Date.now() - i * 86400000 * 5).toISOString().split('T')[0]}</td>
                                <td className="px-6 py-4">
                                    <button className="text-brand-accent hover:underline text-xs font-semibold flex items-center gap-1">
                                        <Download className="w-3 h-3" /> CSV Export
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
