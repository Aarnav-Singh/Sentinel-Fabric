"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ScrollText, Search, ChevronLeft, ChevronRight, Clock, User, Activity } from "lucide-react";

interface AuditEntry {
    id: string;
    timestamp: string;
    action: string;
    user: string;
    client_ip: string;
    detail: string | null;
    path: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("sf_token") : null;
}

async function apiFetch(path: string) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}

const ACTION_COLORS: Record<string, string> = {
    login_success: "text-emerald-400",
    login_failed: "text-red-400",
    logout_success: "text-slate-400",
    mfa_enabled_with_backup_codes: "text-cyan-400",
    admin_user_created: "text-blue-400",
    admin_user_deactivated: "text-orange-400",
    report_csv_generated: "text-purple-400",
    report_pdf_generated: "text-purple-400",
};

export default function AuditPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const pageSize = 25;

    const fetchAudit = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
            if (search) params.set("q", search);
            const data = await apiFetch(`/compliance/audit-trail?${params}`);
            setEntries(data.entries || []);
            setTotal(data.total || 0);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <ScrollText className="w-8 h-8 text-brand-accent" />
                    Audit Trail
                </h1>
                <p className="text-slate-400 mt-2">Platform-wide audit log for compliance and security review.</p>
            </header>

            {/* Search & Pagination Controls */}
            <div className="flex items-center justify-between mb-4 gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        placeholder="Filter by action or user..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded text-white text-sm focus:outline-none focus:border-brand-accent"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{total} entries</span>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1 rounded hover:bg-brand-surface disabled:opacity-30"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs">{page}/{totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1 rounded hover:bg-brand-surface disabled:opacity-30"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Audit Table */}
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-brand-surface/50 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Timestamp</th>
                            <th className="px-6 py-4 font-medium">Action</th>
                            <th className="px-6 py-4 font-medium">User</th>
                            <th className="px-6 py-4 font-medium">IP Address</th>
                            <th className="px-6 py-4 font-medium">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border text-slate-300">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading audit trail...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No audit entries found.</td></tr>
                        ) : entries.map((entry, i) => (
                            <tr key={entry.id || i} className="hover:bg-brand-surface/30 transition-colors">
                                <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                    <Clock className="inline w-3 h-3 mr-1.5 -mt-0.5" />
                                    {new Date(entry.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`font-mono text-xs font-bold ${ACTION_COLORS[entry.action] || "text-slate-300"}`}>
                                        {entry.action}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="flex items-center gap-1.5 text-xs">
                                        <User className="w-3 h-3 text-slate-500" />
                                        {entry.user}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-mono text-xs text-slate-500">{entry.client_ip || "—"}</td>
                                <td className="px-6 py-3 text-xs text-slate-500 max-w-xs truncate">{entry.detail || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
