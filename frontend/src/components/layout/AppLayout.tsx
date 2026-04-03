"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Settings, Zap, FileText, Search, Bell, Shield, Network, LayoutDashboard, Crosshair, Fingerprint, BookOpen, Activity, ShieldCheck, Target, Server, Lock } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const NAV_ITEMS = [
    { id: "campaigns", name: "Command Center", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, badge: null },
    { id: "pipeline", name: "ML Pipeline", href: "/pipeline", icon: <Network className="w-4 h-4" />, badge: null },
    { id: "events", name: "Raw Events", href: "/events", icon: <Fingerprint className="w-4 h-4" />, badge: null },
    { id: "findings", name: "Threat Findings", href: "/findings", icon: <Crosshair className="w-4 h-4" />, badge: null },
    { id: "posture", name: "Posture", href: "/posture", icon: <Shield className="w-4 h-4" />, badge: null },
    { id: "sigma-rules", name: "Sigma Rules", href: "/sigma-rules", icon: <BookOpen className="w-4 h-4" />, badge: null },
    { id: "campaigns", name: "Campaigns", href: "/campaigns", icon: <Target className="w-4 h-4" />, badge: null },
    { id: "soar", name: "SOAR Actions", href: "/soar", icon: <Zap className="w-4 h-4" />, badge: null },
    { id: "compliance", name: "Compliance", href: "/compliance", icon: <ShieldCheck className="w-4 h-4" />, badge: null },
    { id: "assets", name: "Asset Registry", href: "/integrations", icon: <Server className="w-4 h-4" />, badge: null },
    { id: "vault", name: "Secure Vault", href: "/vault", icon: <Lock className="w-4 h-4" />, badge: null },
    { id: "reporting", name: "Reporting", href: "/reporting", icon: <FileText className="w-4 h-4" />, badge: null },
    { id: "health", name: "System Health", href: "/health", icon: <Activity className="w-4 h-4" />, badge: null },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const [eventsRate, setEventsRate] = useState(0);
    const [lastEventCount, setLastEventCount] = useState(0);

    const { data: pipelineStatus } = useSWR('/api/proxy/api/v1/pipeline/status', fetcher, { 
        refreshInterval: 5000 
    });

    useEffect(() => {
        if (pipelineStatus?.events_processed !== undefined) {
            const currentCount = pipelineStatus.events_processed;
            if (lastEventCount > 0 && currentCount >= lastEventCount) {
                // Approximate events per second since last 5s interval
                setEventsRate(Math.max(0, Math.floor((currentCount - lastEventCount) / 5)));
            }
            setLastEventCount(currentCount);
        }
    }, [pipelineStatus]);

    // Don't show the shell on the login page
    if (pathname === "/") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-sf-bg">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sf-accent/10 to-transparent pointer-events-none" />
            <div className="absolute -top-[300px] -right-[300px] w-[800px] h-[800px] bg-sf-accent-2/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-[300px] -left-[300px] w-[600px] h-[600px] bg-sf-critical/5 rounded-full blur-[100px] pointer-events-none" />

            {/* ── Top Command Bar ── */}
            <header className="flex items-center gap-4 shrink-0 sticky top-0 z-50 h-16 bg-sf-surface/70 backdrop-blur-md border-b border-sf-border px-4 sm:px-6">
                {/* Mobile toggle */}
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-sf-muted hover:text-sf-text transition-colors">
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-3 no-underline shrink-0 group">
                    <div className="w-9 h-9 bg-sf-surface-raised border border-sf-border rounded-lg flex items-center justify-center text-sf-accent font-bold text-xs shadow-[0_0_15px_var(--sf-accent)] group-hover:shadow-[0_0_20px_var(--sf-accent)] transition-all">
                        SF
                    </div>
                    <div className="hidden sm:block">
                        <div className="text-[13px] font-bold tracking-widest text-sf-text group-hover:text-sf-text transition-colors">
                            SENTINEL FABRIC
                        </div>
                        <div className="text-[9px] text-sf-accent uppercase tracking-widest font-mono">
                            Threat Intelligence
                        </div>
                    </div>
                </Link>

                <div className="flex-1 px-4 max-w-2xl mx-auto hidden md:block">
                    {/* Omnibar Search */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-sf-muted group-focus-within:text-sf-accent transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-sf-border rounded-lg leading-5 bg-sf-surface text-sf-text placeholder-sf-muted focus:outline-none focus:bg-sf-surface-raised focus:border-sf-active focus:ring-1 focus:ring-sf-active sm:text-sm transition-all shadow-inner"
                            placeholder="Search IPs, domains, hashes, or type '/' for commands..."
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <span className="text-[10px] text-sf-muted font-mono border border-sf-border rounded px-1.5 py-0.5 bg-sf-surface-raised">⌘K</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* Pipeline Telemetry Matrix */}
                    <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-sf-surface-raised border border-sf-border rounded-lg shadow-inner">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${pipelineStatus?.pipeline_active ? 'bg-sf-safe shadow-[0_0_8px_var(--sf-safe)]' : 'bg-sf-muted'}`} />
                            <span className={`text-[11px] font-mono tracking-wide ${pipelineStatus?.pipeline_active ? 'text-sf-safe' : 'text-sf-muted'}`}>
                                {pipelineStatus?.pipeline_active ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                        <div className="w-px h-4 bg-sf-border" />
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span className="text-sf-muted">Rate:</span>
                            <span className="text-sf-data">{eventsRate} <span className="text-sf-muted text-[10px]">EPS</span></span>
                        </div>
                        <div className="w-px h-4 bg-sf-border" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-sf-data tracking-wider uppercase font-mono">
                                {(pipelineStatus?.events_processed || 0).toLocaleString()} <span className="text-sf-muted font-normal">VOL</span>
                            </span>
                        </div>
                    </div>

                    {/* Utils */}
                    <Link href="/incidents" className="relative text-sf-muted hover:text-sf-text transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-sf-surface-raised">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sf-critical rounded-full border border-sf-bg" />
                    </Link>
                    <Link href="/admin" className="text-sf-muted hover:text-sf-text transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-sf-surface-raised">
                        <Settings className="w-4 h-4" />
                    </Link>
                    
                    {/* User Profile Avatar */}
                    <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-tr from-sf-accent-2 to-sf-accent p-[2px] ml-2 cursor-pointer hover:shadow-[0_0_15px_var(--sf-accent-2)] transition-all">
                        <div className="w-full h-full rounded-full bg-sf-surface border border-sf-border flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">OP</span>
                        </div>
                    </Link>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-transform duration-[400ms] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:flex flex-col shrink-0 w-64 bg-sf-surface/80 backdrop-blur-md border-r border-sf-border`}
                >
                    <div className="flex-1 py-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        <div className="px-4">
                            <p className="text-[10px] font-bold tracking-widest text-sf-muted uppercase mb-3 px-2">Operations</p>
                            <nav className="space-y-1">
                                {NAV_ITEMS.map((item) => {
                                    const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/campaigns");
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all relative group ${isActive
                                                    ? "text-sf-text bg-sf-surface-raised border border-sf-active/20"
                                                    : "text-sf-muted hover:text-sf-text hover:bg-sf-surface-raised"
                                                }`}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sf-accent shadow-[0_0_10px_var(--sf-accent)] rounded-r" />
                                            )}
                                            <span className={`${isActive ? "text-sf-accent" : "text-sf-muted group-hover:text-sf-text"} transition-colors`}>
                                                {item.icon}
                                            </span>
                                            <span className={`flex-1 font-medium ${isActive ? "text-shadow-sm" : ""}`}>{item.name}</span>
                                            {item.badge && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isActive
                                                        ? "bg-sf-accent/20 text-sf-accent border border-sf-accent/30"
                                                        : "bg-sf-surface text-sf-muted border border-sf-border"
                                                    }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Tenant info bottom module */}
                    <div className="p-4 mt-auto">
                        <div className="bg-sf-surface-raised border border-sf-border rounded-xl p-4 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold uppercase text-sf-muted tracking-wider">Active Tenant</p>
                                <Shield className="w-3 h-3 text-sf-warning" />
                            </div>
                            <div className="text-sm text-sf-text font-semibold flex items-center gap-2">
                                Global Enterprise
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-sf-border">
                                <span className="relative flex h-2 w-2">
                                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-sf-safe opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sf-safe"></span>
                                </span>
                                <span className="text-[10px] text-sf-muted font-mono">Enclave Secure • 3ms</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
