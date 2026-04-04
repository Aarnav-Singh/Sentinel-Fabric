"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Settings, Zap, FileText, Search, Bell, Shield, Network, LayoutDashboard, Crosshair, Fingerprint, BookOpen, Activity, ShieldCheck, Target, Server, Lock } from "lucide-react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const NAV_ITEMS = [
    { id: "dashboard", name: "Command Center", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "pipeline", name: "ML Pipeline", href: "/pipeline", icon: <Network className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "events", name: "Raw Events", href: "/events", icon: <Fingerprint className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "findings", name: "Threat Findings", href: "/findings", icon: <Crosshair className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "posture", name: "Posture", href: "/posture", icon: <Shield className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "sigma-rules", name: "Sigma Rules", href: "/sigma-rules", icon: <BookOpen className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "campaigns", name: "Campaigns", href: "/campaigns", icon: <Target className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "soar", name: "SOAR Actions", href: "/soar", icon: <Zap className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "compliance", name: "Compliance", href: "/compliance", icon: <ShieldCheck className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "assets", name: "Asset Registry", href: "/integrations", icon: <Server className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "vault", name: "Secure Vault", href: "/vault", icon: <Lock className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "reporting", name: "Reporting", href: "/reporting", icon: <FileText className="w-5 h-5 min-w-[20px]" />, badge: null },
    { id: "health", name: "System Health", href: "/health", icon: <Activity className="w-5 h-5 min-w-[20px]" />, badge: null },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
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
                setEventsRate(Math.max(0, Math.floor((currentCount - lastEventCount) / 5)));
            }
            setLastEventCount(currentCount);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipelineStatus]);

    if (pathname === "/") {
        return <>{children}</>;
    }

    const isSidebarExpanded = sidebarOpen || isHoveringSidebar;

    return (
        <div className="min-h-screen flex flex-col font-sans relative bg-sf-bg text-sf-text selection:bg-sf-accent/30 overflow-hidden">
            
            {/* ── Top Command Bar ── */}
            <header className="flex items-center gap-4 shrink-0 sticky top-0 z-50 h-14 bg-sf-surface border-b border-sf-border px-4 sm:px-6">
                
                <motion.button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden text-sf-muted hover:text-sf-text transition-colors"
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.button>

                <Link href="/dashboard" className="flex items-center gap-3 no-underline shrink-0 group">
                    <div className="w-8 h-8 bg-sf-bg border border-sf-border flex items-center justify-center text-sf-accent font-bold text-xs">
                        UX
                    </div>
                    <div className="hidden sm:block">
                        <div className="text-xs font-bold tracking-widest text-sf-text transition-colors">
                            UMBRIX
                        </div>
                        <div className="text-[9px] text-sf-muted font-mono tracking-widest">
                            NODE: US-EAST-1
                        </div>
                    </div>
                </Link>

                <div className="flex-1 px-4 max-w-2xl mx-auto hidden md:block">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-sf-muted" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-sf-border rounded-none leading-5 bg-sf-bg text-sf-text placeholder-sf-muted focus:outline-none focus:border-sf-accent focus:ring-1 focus:ring-sf-accent sm:text-xs font-mono transition-none"
                            placeholder="SEARCH IP, HASH, CVE..."
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <span className="text-[9px] text-sf-muted font-mono border border-sf-border px-1 bg-sf-surface">⌘K</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden lg:flex items-center gap-4 px-3 py-1 bg-sf-bg border border-sf-border">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 ${pipelineStatus?.pipeline_active ? 'bg-sf-safe' : 'bg-sf-muted'}`} />
                            <span className={`text-[10px] font-mono tracking-wide ${pipelineStatus?.pipeline_active ? 'text-sf-safe' : 'text-sf-muted'}`}>
                                {pipelineStatus?.pipeline_active ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-sf-border" />
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-sf-muted">RATE:</span>
                            <span className="text-sf-text">{eventsRate} EPS</span>
                        </div>
                    </div>

                    <Link href="/incidents" className="text-sf-muted hover:text-sf-text transition-colors relative">
                        <Bell className="w-4 h-4" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-sf-critical border border-sf-surface rounded-none" />
                    </Link>
                    <Link href="/admin" className="text-sf-muted hover:text-sf-text transition-colors">
                        <Settings className="w-4 h-4" />
                    </Link>
                    
                    <Link href="/profile" className="w-7 h-7 bg-sf-bg border border-sf-border flex items-center justify-center ml-2 hover:border-sf-accent transition-colors">
                        <span className="text-[10px] font-bold font-mono text-sf-text">OP</span>
                    </Link>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* Mobile overlay */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 z-40 bg-sf-bg/90 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Sidebar - Slim Default */}
                <aside
                    onMouseEnter={() => setIsHoveringSidebar(true)}
                    onMouseLeave={() => setIsHoveringSidebar(false)}
                    className={`fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-all duration-200 ease-out flex flex-col shrink-0 bg-sf-surface border-r border-sf-border
                        ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:w-16"} 
                        ${isHoveringSidebar ? "lg:w-64 lg:absolute lg:h-[calc(100vh-3.5rem)] lg:shadow-[4px_0_24px_rgba(0,0,0,0.8)]" : ""}
                    `}
                >
                    <div className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <nav className="space-y-0.5 px-2">
                            {NAV_ITEMS.map((item) => {
                                const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/campaigns");
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-4 px-2.5 py-2 text-sm transition-colors relative group whitespace-nowrap
                                            ${isActive ? "text-sf-text bg-sf-bg border border-sf-border" : "text-sf-muted hover:text-sf-text hover:bg-sf-bg border border-transparent"}
                                        `}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sf-accent" />
                                        )}
                                        <span className={`${isActive ? "text-sf-accent" : "text-sf-muted"} shrink-0`}>
                                            {item.icon}
                                        </span>
                                        <span className={`font-mono text-[11px] uppercase tracking-wider transition-opacity duration-200 ${isSidebarExpanded ? "opacity-100" : "opacity-0"}`}>
                                            {item.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className={`p-4 mt-auto border-t border-sf-border transition-opacity duration-200 ${isSidebarExpanded ? "opacity-100" : "opacity-0"}`}>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full bg-sf-safe opacity-75"></span>
                            </span>
                            <span className="text-[10px] text-sf-muted font-mono whitespace-nowrap">SYSTEM SECURE</span>
                        </div>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-0 bg-sf-bg">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col p-6"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
