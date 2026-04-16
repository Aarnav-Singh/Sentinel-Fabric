"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Network, FileCode, Clock, Info, CheckCircle2, History, CheckCircle, RefreshCcw, ThumbsDown, ThumbsUp, Activity } from "lucide-react";
import { useEffect } from "react";

export function CampaignDetailsModal({ campaignId, onClose }: { campaignId: string, onClose: () => void }) {

    // Close on Escape key
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <div className="absolute inset-0 z-0 bg-sf-warning/5 mix-blend-screen pointer-events-none" />
                <motion.div
                    className="w-full max-w-2xl h-full bg-sf-surface/90 border-l border-sf-border/50 shadow-[0_0_50px_rgba(249,115,22,0.1)] flex flex-col relative right-0 backdrop-blur-2xl"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-sf-warning/10 blur-[100px] pointer-events-none rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--sf-accent)]/10 blur-[100px] pointer-events-none rounded-full" />

                    <header className="px-6 pt-6 pb-4 flex items-center justify-between relative z-10 border-b border-sf-border/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-sf-warning animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                            <h2 className="text-xl font-mono font-bold text-white tracking-wider">{campaignId}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-sf-muted hover:text-white rounded-none transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </header>



                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative z-10">

                        {/* Attack Narrative Section */}
                        <section>
                            <h3 className="text-xs uppercase font-bold tracking-widest text-sf-muted mb-4 flex items-center gap-2">
                                <Network className="w-4 h-4 text-sf-warning" /> ATTACK NARRATIVE
                            </h3>
                            <div className="p-4 bg-sf-surface/40 border border-sf-border/50 rounded-none">
                                <p className="text-sm text-sf-muted leading-relaxed">
                                    Adversarial AI signatures matched along with unauthorized lateral movement towards <span className="bg-sf-bg px-1.5 py-0.5 rounded font-mono text-xs text-white border border-sf-border">db-cluster-main</span>. Initial access vector traced to a compromised VPN node using a novel payload structure undetected by traditional AV. The campaign attempts to enumerate Active Directory using living-off-the-land binaries.
                                </p>
                            </div>
                        </section>

                        {/* MITRE Technique Sequence Section */}
                        <section>
                            <h3 className="text-xs uppercase font-bold tracking-widest text-sf-muted mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-sf-warning" /> MITRE TECHNIQUE SEQUENCE
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <MitrePill color="red" code="T1190" name="Exploit Public-Facing App" />
                                <MitrePill color="yellow" code="T1078" name="Valid Accounts" />
                                <MitrePill color="slate" code="T1059" name="Command and Scripting" />
                            </div>
                        </section>

                        {/* Evidence Section (Files) */}
                        <section>
                            <h3 className="text-xs uppercase font-bold tracking-widest text-sf-muted mb-4 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-sf-warning" /> EVIDENCE & ATTACHMENTS
                            </h3>
                            <div className="border border-sf-border/40 bg-sf-surface/20 rounded-none overflow-hidden divide-y divide-sf-border/30">
                                <EvidenceFile name="lsass-memory-dump.dmp" size="1.2 GB" />
                                <EvidenceFile name="encoded-ps-command.log" size="45 KB" />
                                <EvidenceFile name="yara-match-signatures.json" size="12 KB" />
                            </div>
                        </section>

                        {/* Raw Events Section */}
                        <section>
                            <h3 className="text-xs uppercase font-bold tracking-widest text-sf-muted mb-4 flex items-center gap-2">
                                <FileCode className="w-4 h-4 text-sf-warning" /> RAW EVENTS
                            </h3>
                            <div className="space-y-3">
                                <RawEventItem time="12:44:02Z" source="ZEEK" text="Unusual SMB Tree Connect" />
                                <RawEventItem time="12:46:11Z" source="SURICATA" text="Cobalt Strike DNS Beaconing" />
                                <RawEventItem time="12:50:33Z" source="PALO ALTO" text="Outbound connection to known malicious C2" />
                            </div>
                        </section>

                    </div>

                    {/* Footer - RC Feedback */}
                    <div className="px-6 py-4 border-t border-sf-border/30 bg-sf-surface/80 backdrop-blur-md flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold uppercase tracking-widest text-sf-muted">REINFORCEMENT LEARNING FEEDBACK</span>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-none border border-sf-border text-sf-muted hover:text-white hover:bg-sf-surface transition-colors text-sm font-semibold">
                                <ThumbsDown className="w-4 h-4" /> False Positive
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-none bg-sf-warning hover:bg-sf-warning text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-colors text-sm font-semibold">
                                <ThumbsUp className="w-4 h-4" /> True Positive
                            </button>
                        </div>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function MitrePill({ color, code, name }: { color: 'red' | 'yellow' | 'slate', code: string, name: string }) {
    const colorStyles = {
        red: "border-[var(--sf-critical)]/30 text-[var(--sf-critical)] bg-[var(--sf-critical)]/5",
        yellow: "border-[var(--sf-warning)]/30 text-[var(--sf-warning)] bg-[var(--sf-warning)]/5",
        slate: "border-sf-border/30 text-sf-muted bg-sf-muted/5"
    };

    return (
        <div className={`px-3 py-1.5 rounded-none border flex items-center gap-2 text-xs font-mono font-bold ${colorStyles[color]}`}>
            <span>{code}: {name}</span>
        </div>
    );
}

function EvidenceFile({ name, size }: { name: string, size: string }) {
    return (
        <div className="flex items-center justify-between group hover:bg-sf-surface/40 px-4 py-3 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
                <FileCode className="w-4 h-4 text-sf-muted group-hover:text-sf-warning transition-colors" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-sf-muted group-hover:text-white transition-colors">{name}</span>
                    <span className="text-xs text-sf-muted mt-0.5">{size}</span>
                </div>
            </div>
            <span className="text-sf-muted opacity-0 group-hover:opacity-100 transition-opacity tracking-widest leading-none mb-2">...</span>
        </div>
    );
}

function RawEventItem({ time, source, text }: { time: string, source: string, text: string }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-none bg-sf-surface/30 border border-sf-border/40 group hover:border-sf-border/80 hover:bg-sf-surface/60 transition-all">
            <span className="text-xs text-sf-muted font-mono shrink-0 w-20">{time}</span>
            <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-sf-border bg-sf-bg text-sf-muted">
                    {source}
                </span>
                <span className="text-sm font-bold text-white truncate w-full">{text}</span>
            </div>
        </div>
    );
}

