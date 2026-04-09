"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Save, FileCode2, AlertCircle, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MitreConfig {
    technique_id: string;
    technique_name: string;
    tactic: string;
}

interface SigmaRule {
    id: string;
    name: string;
    mitre: MitreConfig;
    conditions: Record<string, any>;
    confidence: number;
}

export default function SigmaRulesPage() {
    const { data: rules, error, isLoading, mutate } = useSWR<SigmaRule[]>("/api/proxy/api/v1/sigma-rules", fetcher);
    
    const { toast } = useToast();
    const [selectedRule, setSelectedRule] = useState<SigmaRule | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form states
    const [formData, setFormData] = useState<SigmaRule | null>(null);
    const [conditionsText, setConditionsText] = useState("");

    const handleSelectRule = (rule: SigmaRule) => {
        setSelectedRule(rule);
        setFormData(rule);
        setConditionsText(JSON.stringify(rule.conditions, null, 2));
        setIsEditing(false);
    };

    const handleNewRule = () => {
        const newRule: SigmaRule = {
            id: `rule-${Date.now()}`,
            name: "New Custom Rule",
            mitre: {
                technique_id: "Txxxx",
                technique_name: "",
                tactic: "initial-access"
            },
            conditions: { "message": "pattern" },
            confidence: 0.8
        };
        setSelectedRule(newRule);
        setFormData(newRule);
        setConditionsText(JSON.stringify(newRule.conditions, null, 2));
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!formData) return;
        
        try {
            // Parse conditions from text
            const parsedConditions = JSON.parse(conditionsText);
            const payload = { ...formData, conditions: parsedConditions };

            // Determine if it's new (not in rules list)
            const isNew = !rules?.some(r => r.id === formData.id) || formData.id !== selectedRule?.id;
            
            const method = isNew ? "POST" : "PUT";
            const url = isNew 
                ? `/api/proxy/api/v1/sigma-rules` 
                : `/api/proxy/api/v1/sigma-rules/${formData.id}`;

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to save rule");
            }

            toast("Rule saved successfully!", "success");
            setIsEditing(false);
            mutate(); // Refresh rules list
            setSelectedRule(payload);
        } catch (e: any) {
            toast(e.message || "Invalid JSON in conditions or server error.", "error");
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this custom rule?")) return;
        try {
            const res = await fetch(`/api/proxy/api/v1/sigma-rules/${ruleId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete rule");
            toast("Rule deleted successfully", "success");
            mutate();
            if (selectedRule?.id === ruleId) {
                setSelectedRule(null);
                setFormData(null);
            }
        } catch (e: any) {
            toast(e.message, "error");
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-sf-bg">
            <header className="shrink-0 px-6 py-5 border-b border-sf-border bg-sf-surface/30 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-medium tracking-wide text-white flex items-center gap-3">
                        <FileCode2 className="w-5 h-5 text-sf-accent" />
                        Sigma Rule Management
                    </h1>
                    <p className="text-sm text-sf-muted mt-1">
                        Create, manage, and distribute custom Sigma detection signatures.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-sf-border bg-sf-surface hover:bg-sf-surface/80 text-sf-text text-sm cursor-pointer rounded transition-colors">
                        <span>Import Rules</span>
                        <input 
                            type="file" 
                            accept=".zip,.yml,.yaml" 
                            className="hidden" 
                            onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                const formData = new FormData();
                                formData.append("file", e.target.files[0]);
                                try {
                                    const res = await fetch("/api/proxy/api/v1/sigma-rules/import", {
                                        method: "POST",
                                        body: formData
                                    });
                                    if (res.ok) {
                                        toast("Rules imported successfully!", "success");
                                        mutate();
                                    } else {
                                        const err = await res.json();
                                        toast("Import failed: " + (err.detail || 'Unknown error'), "error");
                                    }
                                } catch (err: any) {
                                    toast("Import error: " + err.message, "error");
                                }
                                e.target.value = '';
                            }}
                        />
                    </label>
                    <a 
                        href="/api/proxy/api/v1/sigma-rules/export"
                        download
                        className="flex items-center gap-2 px-3 py-1.5 bg-sf-accent text-sf-bg hover:bg-sf-accent/90 text-sm font-medium rounded transition-colors"
                    >
                        Export All ZIP
                    </a>
                </div>
            </header>

            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar - Rule List */}
                <div className="w-1/3 border-r border-sf-border flex flex-col bg-sf-surface/10">
                    <div className="p-4 border-b border-sf-border flex justify-between items-center">
                        <h2 className="text-sm font-medium text-slate-300">Custom Rules</h2>
                        <button 
                            onClick={handleNewRule}
                            className="p-1.5 hover:bg-sf-surface rounded text-sf-accent hover:text-sf-accent/80 transition-colors"
                            title="New Rule"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isLoading ? (
                            <div className="text-sm text-sf-muted text-center py-4">Loading rules...</div>
                        ) : error || !Array.isArray(rules) ? (
                            <div className="bg-sf-critical/10 border border-sf-critical/30 p-4 m-4 rounded flex flex-col items-center justify-center text-center">
                                <AlertCircle className="w-8 h-8 text-sf-critical mb-2" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-sf-critical font-bold mt-2">API CONNECTION FAILED</span>
                                <span className="text-[9px] font-mono text-sf-muted mt-2">
                                    {(rules as any)?.detail || (rules as any)?.error || (error as any)?.message || "Unable to retrieve Sigma rules."}
                                </span>
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="text-sm text-sf-muted text-center py-8">
                                No custom rules found.<br/>Click + to create one.
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <button
                                    key={rule.id}
                                    onClick={() => handleSelectRule(rule)}
                                    className={`w-full text-left p-3 rounded border transition-colors ${
                                        selectedRule?.id === rule.id 
                                        ? "bg-sf-surface border-sf-accent text-white" 
                                        : "bg-sf-surface border-sf-border text-sf-muted hover:border-slate-600"
                                    }`}
                                >
                                    <div className="text-sm font-medium truncate">{rule.name}</div>
                                    <div className="text-xs mt-1 text-sf-muted flex justify-between">
                                        <span>{rule.id}</span>
                                        <span className="text-sf-accent/70">{rule.mitre?.tactic || "tactic"}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Area - Rule Editor */}
                <div className="flex-1 overflow-y-auto bg-sf-bg">
                    {selectedRule && formData ? (
                        <div className="p-6 max-w-3xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                    {isEditing ? "Editing Rule" : "Rule Details"}
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="ml-2 text-sf-muted hover:text-white">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </h2>
                                <div className="flex gap-2">
                                    {isEditing && (
                                        <button 
                                            onClick={handleSave}
                                            className="px-3 py-1.5 bg-sf-accent text-sf-bg rounded text-sm font-medium hover:bg-sf-accent/90 flex items-center gap-2"
                                        >
                                            <Save className="w-4 h-4" /> Save Rule
                                        </button>
                                    )}
                                    {!isEditing && (
                                        <button 
                                            onClick={() => handleDelete(selectedRule.id)}
                                            className="p-1.5 text-sf-muted hover:text-red-400 rounded transition-colors"
                                            title="Delete Rule"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-sf-muted mb-2">Rule ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.id}
                                            onChange={(e) => setFormData({...formData, id: e.target.value})}
                                            disabled={!isEditing}
                                            className="w-full bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-sf-muted mb-2">Rule Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            disabled={!isEditing}
                                            className="w-full bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-sf-muted mb-2">MITRE ATT&CK Mapping</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Tactic (e.g. execution)"
                                            value={formData.mitre?.tactic || ""}
                                            onChange={(e) => setFormData({...formData, mitre: {...(formData.mitre || {}), tactic: e.target.value}} as SigmaRule)}
                                            disabled={!isEditing}
                                            className="w-full bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Technique ID (e.g. T1059)"
                                            value={formData.mitre?.technique_id || ""}
                                            onChange={(e) => setFormData({...formData, mitre: {...(formData.mitre || {}), technique_id: e.target.value}} as SigmaRule)}
                                            disabled={!isEditing}
                                            className="w-full bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Technique Name"
                                            value={formData.mitre?.technique_name || ""}
                                            onChange={(e) => setFormData({...formData, mitre: {...(formData.mitre || {}), technique_name: e.target.value}} as SigmaRule)}
                                            disabled={!isEditing}
                                            className="w-full bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Conditions */}
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-sf-muted mb-2 flex justify-between">
                                        <span>Conditions (JSON Format)</span>
                                    </label>
                                    <textarea 
                                        value={conditionsText}
                                        onChange={(e) => setConditionsText(e.target.value)}
                                        disabled={!isEditing}
                                        rows={6}
                                        className="w-full bg-sf-surface font-mono text-sm border border-sf-border rounded p-3 text-slate-300 focus:border-sf-accent focus:outline-none disabled:opacity-75"
                                        placeholder='{ "message": "suspicious.*pattern" }'
                                    />
                                    <p className="mt-1 text-xs text-sf-muted">Edit conditions as a raw JSON object string.</p>
                                </div>
                                
                                {/* Confidence */}
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-sf-muted mb-2">Confidence Score (0.0 - 1.0)</label>
                                    <input 
                                        type="number" 
                                        step="0.05"
                                        min="0"
                                        max="1"
                                        value={formData.confidence}
                                        onChange={(e) => setFormData({...formData, confidence: parseFloat(e.target.value)})}
                                        disabled={!isEditing}
                                        className="w-1/3 bg-sf-surface border border-sf-border rounded px-3 py-2 text-sm text-white focus:border-sf-accent focus:outline-none disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-sf-muted">
                            Select a rule from the left to view or edit details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
