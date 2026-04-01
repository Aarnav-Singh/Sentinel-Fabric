"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Database, Clock, Save, AlertTriangle, CheckCircle2, Trash2, HardDrive } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("sf_token") : null;
}

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts.headers || {}),
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

const PRESETS = [
    { days: 30, label: "30 days", description: "Minimum for most use cases" },
    { days: 90, label: "90 days", description: "Recommended for SOC 2" },
    { days: 180, label: "180 days", description: "HIPAA minimum" },
    { days: 365, label: "1 year", description: "PCI-DSS v4.0 requirement" },
];

export default function RetentionPage() {
    const [currentDays, setCurrentDays] = useState(90);
    const [pendingDays, setPendingDays] = useState(90);
    const [saving, setSaving] = useState(false);
    const [purging, setPurging] = useState(false);
    const [saved, setSaved] = useState(false);
    const [purgeResult, setPurgeResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch current retention setting on mount
    useEffect(() => {
        // The retention period is stored as clickhouse_ttl_days in config
        // For now, default to 90 and allow the user to change it
        setCurrentDays(90);
        setPendingDays(90);
    }, []);

    const saveRetention = async () => {
        if (pendingDays < 30 || pendingDays > 365) {
            setError("Retention must be between 30 and 365 days.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            // This calls the compliance/retention endpoint to enforce at the DB level
            await apiFetch(`/compliance/retention?retention_days=${pendingDays}`, {
                method: "POST",
            });
            setCurrentDays(pendingDays);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const triggerPurge = async () => {
        if (!confirm("Are you sure you want to purge data older than the retention period? This action is irreversible.")) {
            return;
        }

        setPurging(true);
        setError(null);
        try {
            const result = await apiFetch(`/compliance/retention?retention_days=${currentDays}`, {
                method: "POST",
            });
            setPurgeResult(`Purged ${result.purged_rows || 0} rows older than ${result.retention_days} days.`);
            setTimeout(() => setPurgeResult(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setPurging(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Database className="w-8 h-8 text-brand-accent" />
                    Data Retention
                </h1>
                <p className="text-slate-400 mt-2">Configure how long security events and audit logs are retained.</p>
            </header>

            {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                    <button onClick={() => setError(null)} className="ml-auto underline text-xs">Dismiss</button>
                </div>
            )}

            {saved && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Retention policy updated successfully.
                </div>
            )}

            {purgeResult && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> {purgeResult}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Current Setting */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-6 space-y-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-brand-accent/80 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Retention Period
                    </h2>

                    <div className="text-center py-6">
                        <div className="text-6xl font-bold text-white tabular-nums">{pendingDays}</div>
                        <p className="text-slate-400 text-sm mt-2">days</p>
                    </div>

                    <input
                        type="range"
                        min={30}
                        max={365}
                        step={1}
                        value={pendingDays}
                        onChange={e => setPendingDays(Number(e.target.value))}
                        className="w-full accent-brand-accent"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>30d</span>
                        <span>90d</span>
                        <span>180d</span>
                        <span>365d</span>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.days}
                                onClick={() => setPendingDays(preset.days)}
                                className={`px-3 py-2 rounded border text-xs text-left transition-all ${
                                    pendingDays === preset.days
                                        ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                                        : "border-brand-border bg-brand-surface text-slate-400 hover:border-slate-500"
                                }`}
                            >
                                <span className="font-bold">{preset.label}</span>
                                <p className="text-[9px] mt-0.5 opacity-70">{preset.description}</p>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={saveRetention}
                        disabled={saving || pendingDays === currentDays}
                        className="w-full px-4 py-2.5 bg-brand-accent text-brand-dark font-bold rounded hover:bg-brand-accent/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Retention Policy"}
                    </button>
                </div>

                {/* Info & Purge */}
                <div className="space-y-6">
                    <div className="bg-brand-card border border-brand-border rounded-xl p-6 space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-accent/80">
                            Compliance Requirements
                        </h2>
                        <div className="space-y-3">
                            {[
                                { framework: "SOC 2 Type II", minimum: "90 days", color: "text-cyan-400" },
                                { framework: "HIPAA", minimum: "180 days (6 years for records)", color: "text-purple-400" },
                                { framework: "PCI-DSS v4.0", minimum: "365 days", color: "text-orange-400" },
                                { framework: "GDPR", minimum: "As long as needed (Art. 5)", color: "text-blue-400" },
                                { framework: "NIST CSF 2.0", minimum: "Organization-defined", color: "text-emerald-400" },
                            ].map(item => (
                                <div key={item.framework} className="flex justify-between items-center py-2 border-b border-brand-border last:border-0">
                                    <span className={`text-sm font-medium ${item.color}`}>{item.framework}</span>
                                    <span className="text-xs text-slate-400 font-mono">{item.minimum}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-brand-card border border-red-500/20 rounded-xl p-6 space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-red-400/80 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Manual Data Purge
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Manually trigger a data purge to remove events and audit data older than
                            the current retention period ({currentDays} days). This operation is
                            <strong className="text-red-400"> irreversible</strong>.
                        </p>
                        <button
                            onClick={triggerPurge}
                            disabled={purging}
                            className="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                        >
                            <Trash2 className="w-4 h-4" />
                            {purging ? "Purging..." : "Purge Expired Data"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
