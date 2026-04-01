"use client";

import { User, Shield, Building2, Mail, Moon, Sun, Key, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function parseJwt(token: string): Record<string, any> | null {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("sf_token") : null;
}

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
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

export default function ProfilePage() {
    const [darkMode, setDarkMode] = useState(true);
    const [claims, setClaims] = useState<Record<string, any>>({});

    // MFA state
    const [mfaStep, setMfaStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
    const [mfaSecret, setMfaSecret] = useState("");
    const [mfaUri, setMfaUri] = useState("");
    const [mfaCode, setMfaCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('sf_token') : null;
        if (token) {
            const parsed = parseJwt(token);
            if (parsed) setClaims(parsed);
        }
    }, []);

    const name = claims.display_name || claims.sub || "Analyst";
    const email = claims.email || claims.sub || "—";
    const role = claims.role || "analyst";
    const tenant = claims.tenant_id || "default";
    const mfaEnabled = !!claims.mfa_enabled;

    const roleColors: Record<string, string> = {
        admin: "text-red-400 bg-red-400/10 border-red-400/30",
        analyst: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
        viewer: "text-slate-400 bg-slate-400/10 border-slate-400/30",
    };

    const startMfaSetup = async () => {
        try {
            setMfaError(null);
            const data = await apiFetch("/api/v1/auth/enable-mfa", { method: "POST" });
            setMfaSecret(data.secret);
            setMfaUri(data.provisioning_uri);
            setMfaStep("setup");
        } catch (err: any) {
            setMfaError(err.message);
        }
    };

    const verifyMfa = async () => {
        try {
            setMfaError(null);
            const data = await apiFetch("/api/v1/auth/verify-mfa-setup", {
                method: "POST", body: JSON.stringify({ mfa_code: mfaCode }),
            });
            setBackupCodes(data.backup_codes || []);
            setMfaStep("done");
        } catch (err: any) {
            setMfaError(err.message);
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 overflow-auto custom-scrollbar p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <header>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <User className="w-6 h-6 text-brand-accent" />
                        Analyst Profile
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Account details and preferences</p>
                </header>

                {/* Identity Card */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent/30 to-brand-accent/10 border border-brand-accent/40 flex items-center justify-center">
                            <span className="text-2xl font-bold text-brand-accent">{name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{name}</h2>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${roleColors[role] ?? roleColors.viewer}`}>
                                {role}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-border">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Email</p>
                                <p className="text-sm text-white font-mono">{email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tenant</p>
                                <p className="text-sm text-white font-mono">{tenant}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-slate-500" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Role</p>
                                <p className="text-sm text-white capitalize">{role}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MFA Management */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent/80 mb-4 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" />
                        Multi-Factor Authentication
                    </h3>

                    {mfaError && (
                        <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {mfaError}
                        </div>
                    )}

                    {mfaStep === "idle" && (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-white font-medium">
                                    {mfaEnabled ? "MFA is enabled" : "MFA is not enabled"}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {mfaEnabled
                                        ? "Your account is protected with two-factor authentication."
                                        : "Enable TOTP-based two-factor authentication for added security."}
                                </p>
                            </div>
                            {!mfaEnabled && (
                                <button
                                    onClick={startMfaSetup}
                                    className="px-4 py-2 bg-brand-accent text-brand-dark font-bold rounded text-xs hover:bg-brand-accent/90"
                                >
                                    Enable MFA
                                </button>
                            )}
                            {mfaEnabled && (
                                <span className="px-2 py-1 rounded text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30">
                                    ✓ Active
                                </span>
                            )}
                        </div>
                    )}

                    {mfaStep === "setup" && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-300">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                            </p>
                            <div className="bg-white p-4 rounded-lg w-fit mx-auto">
                                {/* QR code placeholder — use provisioning URI */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaUri)}`}
                                    alt="MFA QR Code"
                                    className="w-48 h-48"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Or enter this secret manually:</p>
                                <code className="text-xs text-brand-accent font-mono bg-brand-surface px-3 py-1 rounded border border-brand-border">
                                    {mfaSecret}
                                </code>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    placeholder="Enter 6-digit code"
                                    value={mfaCode}
                                    onChange={e => setMfaCode(e.target.value)}
                                    maxLength={6}
                                    className="flex-1 px-3 py-2 bg-brand-surface border border-brand-border rounded text-white text-sm text-center tracking-[0.3em] focus:outline-none focus:border-brand-accent"
                                />
                                <button
                                    onClick={verifyMfa}
                                    disabled={mfaCode.length < 6}
                                    className="px-4 py-2 bg-brand-accent text-brand-dark font-bold rounded text-xs hover:bg-brand-accent/90 disabled:opacity-40"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    )}

                    {mfaStep === "done" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                                <p className="font-bold text-sm">MFA enabled successfully!</p>
                            </div>
                            <p className="text-xs text-slate-400">
                                Save these backup codes in a safe place. Each code can only be used once.
                            </p>
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, i) => (
                                        <code key={i} className="text-xs text-slate-300 font-mono">{code}</code>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={copyBackupCodes}
                                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded"
                            >
                                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copied ? "Copied!" : "Copy All"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Preferences */}
                <div className="bg-brand-card border border-brand-border rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent/80 mb-4">Preferences</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {darkMode ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                            <div>
                                <p className="text-sm text-white font-medium">Dark Mode</p>
                                <p className="text-[10px] text-slate-500">Toggle interface theme</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${darkMode ? 'bg-brand-accent' : 'bg-slate-600'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

