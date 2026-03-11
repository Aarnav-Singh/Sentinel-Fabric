"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Save, ChevronRight, Terminal, CheckCircle2, Activity, Play, Code } from "lucide-react";
import { useEffect, useState } from "react";

const VENDORS = [
    { id: "suricata", name: "Suricata IDS/IPS", category: "Network", pattern: "push" },
    { id: "zeek", name: "Zeek Network Security Monitor", category: "Network", pattern: "push" },
    { id: "windows-events", name: "Windows Event Logs (Winlogbeat)", category: "Endpoint", pattern: "push" },
    { id: "crowdstrike", name: "CrowdStrike Falcon", category: "Endpoint", pattern: "pull" },
    { id: "okta", name: "Okta Identity Cloud", category: "Identity", pattern: "pull" },
    { id: "aws-cloudtrail", name: "AWS CloudTrail", category: "Cloud", pattern: "pull" },
    { id: "azure-ad", name: "Azure / Entra ID", category: "Identity", pattern: "pull" },
    { id: "palo-alto", name: "Palo Alto NGFW", category: "Firewall", pattern: "syslog" },
    { id: "generic-syslog", name: "Generic Syslog Device", category: "Generic", pattern: "syslog" },
];

export function AddIntegrationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [testLog, setTestLog] = useState("");
    const [testResult, setTestResult] = useState<string | null>(null);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [isHealthy, setIsHealthy] = useState(false);

    const activeVendor = VENDORS.find(v => v.id === selectedVendorId);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedVendorId("");
            setTestLog("");
            setTestResult(null);
            setIsProvisioning(false);
            setIsHealthy(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    if (!isOpen) return null;

    const handleTestParser = () => {
        if (!testLog.trim()) return;
        setTestResult(null);
        setTimeout(() => {
            setTestResult(JSON.stringify({
                _metadata: {
                    vendor: activeVendor?.name,
                    pattern: activeVendor?.pattern,
                    normalized_at: new Date().toISOString()
                },
                event_type: "threat_detected",
                severity: "HIGH",
                source_ip: "192.168.1.104",
                destination_ip: "10.0.0.5",
                action: "blocked",
                raw_payload_snippet: testLog.substring(0, 50) + "..."
            }, null, 2));
        }, 600);
    };

    const handleProvision = () => {
        setStep(4);
        setIsProvisioning(true);
        setTimeout(() => {
            setIsProvisioning(false);
            setIsHealthy(true);
        }, 1500);
    };

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Select Integration Source</label>
                <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2.5 px-4 text-sm text-text-primary focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="">Choose a tool...</option>
                    {VENDORS.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.category} - {v.pattern.toUpperCase()})</option>
                    ))}
                </select>
            </div>
            {activeVendor && (
                <div className="bg-surface-elevated p-4 rounded-xl border border-surface-border flex items-start gap-3 mt-4">
                    <Activity className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-text-primary">Connection Architecture: {activeVendor.pattern.toUpperCase()}</p>
                        <p className="text-xs text-text-secondary mt-1">
                            {activeVendor.pattern === 'push' && "Agent-based edge normalization. Low latency, highly secure mTLS."}
                            {activeVendor.pattern === 'pull' && "Polls vendor API periodically. Best for cloud-native or SaaS tools."}
                            {activeVendor.pattern === 'syslog' && "Universal UDP/TCP ingestion. Normalization happens centrally."}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );

    const renderAuthInputs = () => {
        if (selectedVendorId === 'crowdstrike') {
            return (
                <div className="space-y-3">
                    <input type="text" placeholder="OAuth2 Client ID" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none" />
                    <input type="password" placeholder="OAuth2 Client Secret" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none tracking-widest" />
                </div>
            );
        }
        if (selectedVendorId === 'aws-cloudtrail') {
            return (
                <div className="space-y-3">
                    <input type="text" placeholder="AWS Access Key ID" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none" />
                    <input type="password" placeholder="AWS Secret Access Key" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none tracking-widest" />
                    <input type="text" placeholder="AWS Region (e.g. us-east-1)" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none" />
                </div>
            );
        }
        if (selectedVendorId === 'azure-ad') {
            return (
                <div className="space-y-3">
                    <input type="text" placeholder="Tenant ID" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none" />
                    <input type="text" placeholder="Client ID" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none" />
                    <input type="password" placeholder="Client Secret" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2 px-3 text-sm text-text-primary focus:border-brand-orange outline-none tracking-widest" />
                </div>
            );
        }
        return (
            <input type="password" placeholder="API Token / Key" className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2.5 px-4 text-sm text-text-primary focus:border-brand-orange outline-none tracking-widest" />
        );
    };

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {activeVendor?.pattern === 'push' && (
                <>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Edge Agent Identity</label>
                        <p className="text-xs text-text-secondary mb-3 ml-1">Generate an mTLS certificate token for this agent to authenticate to the ingest gateway.</p>
                        <input type="password" placeholder="mTLS Provisioning Token (Auto-generated)" defaultValue="sf-edge-token-9382fjk2-mock" disabled className="w-full bg-[#0a1119]/50 border border-surface-border rounded-lg py-2.5 px-4 text-sm text-text-muted outline-none tracking-widest mb-4" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Deployment Script</label>
                        <div className="bg-[#0a1119] border border-surface-border p-3 rounded-lg font-mono text-xs text-brand-orange overflow-x-auto whitespace-pre">
                            {`curl -sSL https://fabric.sentinel.run/install-edge.sh | bash -s \\
  --tenant "mock-tenant-id" \\
  --token "sf-edge-token-9382fjk2-mock" \\
  --source "\${activeVendor.id}"`}
                        </div>
                    </div>
                </>
            )}

            {activeVendor?.pattern === 'pull' && (
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Authentication Credentials</label>
                    <p className="text-xs text-text-secondary mb-3 ml-1">Provide read-only API credentials for querying the {activeVendor.name} API.</p>
                    {renderAuthInputs()}
                </div>
            )}

            {activeVendor?.pattern === 'syslog' && (
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Syslog Receiver Configuration</label>
                    <p className="text-xs text-text-secondary mb-3 ml-1">Configure your appliance to forward syslog data to this endpoint.</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-[#0a1119] border border-surface-border p-3 rounded-lg font-mono text-xs text-text-primary">
                            <span>Ingest IP:</span>
                            <span className="text-brand-orange">198.51.100.42</span>
                        </div>
                        <div className="flex items-center justify-between bg-[#0a1119] border border-surface-border p-3 rounded-lg font-mono text-xs text-text-primary">
                            <span>Port / Protocol:</span>
                            <span className="text-brand-orange">514 / UDP</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 italic">Format detection is automatic. JSON, CEF, or raw text are supported.</p>
                </div>
            )}
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Test Event Injection</label>
                <p className="text-xs text-text-secondary mb-3 ml-1">Paste a raw sample log below to verify that it parses correctly into a CanonicalEvent.</p>
                <textarea
                    value={testLog}
                    onChange={e => setTestLog(e.target.value)}
                    placeholder='{"timestamp": "2026-03-05T...'
                    className="w-full h-32 bg-[#0a1119] border border-surface-border rounded-lg p-3 text-xs text-text-primary font-mono focus:border-brand-orange outline-none resize-none"
                    spellCheck={false}
                />
            </div>

            <button
                onClick={handleTestParser}
                disabled={!testLog.trim()}
                className="flex items-center gap-2 bg-surface-elevated hover:bg-surface-panel border border-surface-border px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
                <Code className="w-4 h-4" /> Simulate Parser
            </button>

            <AnimatePresence>
                {testResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1.5 block ml-1 mt-4">Parsed Canonical Event (Success)</label>
                        <pre className="w-full bg-[#05080c] border border-green-500/20 rounded-lg p-3 text-[10px] text-green-400 font-mono overflow-auto max-h-48 mt-1">
                            {testResult}
                        </pre>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            {isProvisioning ? (
                <>
                    <div className="w-12 h-12 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin mb-2" />
                    <h3 className="text-lg font-bold text-text-primary">Provisioning Connector...</h3>
                    <p className="text-xs text-text-secondary">Registering heartbeat and allocating ingestion paths.</p>
                    <p className="text-[10px] text-text-muted mt-4">(Backend endpoints mocked for frontend demo)</p>
                </>
            ) : isHealthy ? (
                <>
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">Connection Verified</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface-elevated rounded-full border border-surface-border text-xs font-mono text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                        Heartbeat Received
                    </div>
                    {activeVendor?.pattern !== 'pull' && (
                        <p className="text-sm font-mono text-text-primary mt-2">
                            Throughput: <span className="text-green-400 font-bold">~24 EPS</span>
                        </p>
                    )}
                </>
            ) : null}
        </motion.div>
    );

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={onClose}
            >
                <motion.div
                    className="w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col relative overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <header className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-panel backdrop-blur-md">
                        <div>
                            <h2 className="text-xl font-display font-bold text-text-primary tracking-wide">Add Integration</h2>
                            <div className="flex items-center gap-2 mt-2 text-xs font-mono font-bold text-text-muted">
                                <span className={step >= 1 ? "text-brand-orange" : ""}>1. Tool</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className={step >= 2 ? "text-brand-orange" : ""}>2. Config</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className={step >= 3 ? "text-brand-orange" : ""}>3. Test</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className={step >= 4 ? "text-brand-orange" : ""}>4. Health</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors absolute top-4 right-4">
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="p-6 relative min-h-[350px]">
                        <AnimatePresence mode="wait">
                            <motion.div key={step} className="absolute inset-0 p-6 overflow-y-auto">
                                {step === 1 && renderStep1()}
                                {step === 2 && renderStep2()}
                                {step === 3 && renderStep3()}
                                {step === 4 && renderStep4()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <footer className="px-6 py-4 border-t border-surface-border bg-surface-panel flex items-center justify-between">
                        {step > 1 && step < 4 ? (
                            <button
                                onClick={() => setStep((s) => s - 1 as any)}
                                className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors text-sm font-semibold"
                            >
                                Back
                            </button>
                        ) : <div />}

                        <div className="flex items-center gap-3">
                            {step < 4 && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors text-sm hover:bg-surface-elevated font-semibold"
                                >
                                    Cancel
                                </button>
                            )}

                            {step === 1 && (
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedVendorId}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-orange hover:bg-brand-orangeHover text-white transition-all text-sm font-bold disabled:opacity-50"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            {step === 2 && (
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-orange hover:bg-brand-orangeHover text-white transition-all text-sm font-bold"
                                >
                                    Next: Test Data <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            {step === 3 && (
                                <button
                                    onClick={handleProvision}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-orange hover:bg-brand-orangeHover text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all text-sm font-bold"
                                >
                                    <Save className="w-4 h-4" /> Provision Network
                                </button>
                            )}

                            {step === 4 && isHealthy && (
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all text-sm font-bold"
                                >
                                    Finish & Close
                                </button>
                            )}
                        </div>
                    </footer>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export function IntegrationSettingsModal({ integration, onClose, onDelete }: { integration: any, onClose: () => void, onDelete?: (id: string) => void }) {
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    if (!integration) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={onClose}
            >
                <motion.div
                    className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col relative"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <header className="p-6 border-b border-surface-border flex items-center justify-between bg-surface-panel backdrop-blur-md rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center shadow-inner">
                                <integration.icon className="w-5 h-5 text-brand-orange" />
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-bold text-text-primary tracking-wide">Configure Connector</h2>
                                <p className="text-xs font-mono text-text-muted mt-1">{integration.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg border border-surface-border">
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">Data Ingestion Engine</p>
                                    <p className="text-xs text-text-muted mt-1">Halt log syncing from this source.</p>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${integration.status === 'connected' ? 'bg-brand-orange' : 'bg-surface-panel border border-surface-border'}`}>
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${integration.status === 'connected' ? 'left-[22px]' : 'left-[3px]'}`} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block ml-1">Polling Frequency</label>
                                <select className="w-full bg-[#0a1119] border border-surface-border rounded-lg py-2.5 px-4 text-sm text-text-primary focus:border-brand-orange outline-none transition-all cursor-pointer">
                                    <option>Real-time (Webhooks)</option>
                                    <option>Every 5 minutes</option>
                                    <option>Every 15 minutes</option>
                                    <option>Every 1 hour</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <footer className="p-6 border-t border-surface-border bg-surface-panel rounded-b-2xl flex items-center justify-between gap-3">
                        <button
                            onClick={() => {
                                if (onDelete) onDelete(integration.id);
                                onClose();
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm transition-colors border border-transparent hover:border-red-500/30"
                        >
                            Delete Integration
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-lg text-text-secondary hover:text-text-primary font-semibold hover:bg-surface-elevated transition-colors text-sm"
                            >
                                Close
                            </button>
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-elevated hover:bg-brand-orange hover:text-white border border-surface-border hover:border-transparent transition-all text-sm font-semibold text-text-primary"
                            >
                                <Save className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </footer>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
