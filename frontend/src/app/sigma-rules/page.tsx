"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Save, FileCode2, AlertCircle, Edit2 } from "lucide-react";

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
    
    const [selectedRule, setSelectedRule] = useState<SigmaRule | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form states
    const [formData, setFormData] = useState<SigmaRule | null>(null);
    const [conditionsText, setConditionsText] = useState("");
    const [submitStatus, setSubmitStatus] = useState<{type: "success" | "error", message: string} | null>(null);

    const handleSelectRule = (rule: SigmaRule) => {
        setSelectedRule(rule);
        setFormData(rule);
        setConditionsText(JSON.stringify(rule.conditions, null, 2));
        setIsEditing(false);
        setSubmitStatus(null);
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
        setSubmitStatus(null);
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

            setSubmitStatus({ type: "success", message: "Rule saved successfully!" });
            setIsEditing(false);
            mutate(); // Refresh rules list
            setSelectedRule(payload);
        } catch (e: any) {
            setSubmitStatus({ type: "error", message: e.message || "Invalid JSON in conditions or server error." });
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this custom rule?")) return;
        try {
            const res = await fetch(`/api/proxy/api/v1/sigma-rules/${ruleId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete rule");
            mutate();
            if (selectedRule?.id === ruleId) {
                setSelectedRule(null);
                setFormData(null);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-brand-dark">
            <header className="shrink-0 px-6 py-5 border-b border-brand-border bg-brand-surface/30">
                <h1 className="text-xl font-medium tracking-wide text-white flex items-center gap-3">
                    <FileCode2 className="w-5 h-5 text-brand-accent" />
                    Sigma Rule Management
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Create and manage custom Sigma detection rules for the anomaly detection pipeline.
                </p>
            </header>

            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar - Rule List */}
                <div className="w-1/3 border-r border-brand-border flex flex-col bg-brand-surface/10">
                    <div className="p-4 border-b border-brand-border flex justify-between items-center">
                        <h2 className="text-sm font-medium text-slate-300">Custom Rules</h2>
                        <button 
                            onClick={handleNewRule}
                            className="p-1.5 hover:bg-brand-card rounded text-brand-accent hover:text-brand-accent/80 transition-colors"
                            title="New Rule"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isLoading ? (
                            <div className="text-sm text-slate-500 text-center py-4">Loading rules...</div>
                        ) : error ? (
                            <div className="text-sm text-red-400 text-center py-4">Failed to load rules</div>
                        ) : !Array.isArray(rules) ? (
                            <div className="text-sm text-red-400 text-center py-4 text-wrap break-words">{(rules as any)?.detail || (rules as any)?.error || "Invalid response from server"}</div>
                        ) : rules.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-8">
                                No custom rules found.<br/>Click + to create one.
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <button
                                    key={rule.id}
                                    onClick={() => handleSelectRule(rule)}
                                    className={`w-full text-left p-3 rounded border transition-colors ${
                                        selectedRule?.id === rule.id 
                                        ? "bg-brand-card border-brand-accent text-white" 
                                        : "bg-brand-surface border-brand-border text-slate-400 hover:border-slate-600"
                                    }`}
                                >
                                    <div className="text-sm font-medium truncate">{rule.name}</div>
                                    <div className="text-xs mt-1 text-slate-500 flex justify-between">
                                        <span>{rule.id}</span>
                                        <span className="text-brand-accent/70">{rule.mitre?.tactic || "tactic"}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Area - Rule Editor */}
                <div className="flex-1 overflow-y-auto bg-brand-dark">
                    {selectedRule && formData ? (
                        <div className="p-6 max-w-3xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                    {isEditing ? "Editing Rule" : "Rule Details"}
                                    {!isEditing && (
                                        <button onClick={() => setIsEditing(true)} className="ml-2 text-slate-400 hover:text-white">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </h2>
                                <div className="flex gap-2">
                                    {isEditing && (
                                        <button 
                                            onClick={handleSave}
                                            className="px-3 py-1.5 bg-brand-accent text-brand-dark rounded text-sm font-medium hover:bg-brand-accent/90 flex items-center gap-2"
                                        >
                                            <Save className="w-4 h-4" /> Save Rule
                                        </button>
                                    )}
                                    {!isEditing && (
                                        <button 
                                            onClick={() => handleDelete(selectedRule.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                                            title="Delete Rule"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {submitStatus && (
                                <div className={`p-3 rounded mb-6 text-sm flex items-center gap-2 ${
                                    submitStatus.type === "success" ? "bg-brand-success/10 text-brand-success border border-brand-success/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}>
                                    <AlertCircle className="w-4 h-4" />
                                    {submitStatus.message}
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Rule ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.id}
                                            onChange={(e) => setFormData({...formData, id: e.target.value})}
                                            disabled={!isEditing}
                                            className="w-full bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Rule Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            disabled={!isEditing}
                                            className="w-full bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Mitre Mapping */}
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">MITRE ATT&CK Mapping</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Tactic (e.g. execution)"
                                            value={formData.mitre.tactic}
                                            onChange={(e) => setFormData({...formData, mitre: {...formData.mitre, tactic: e.target.value}})}
                                            disabled={!isEditing}
                                            className="w-full bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Technique ID (e.g. T1059)"
                                            value={formData.mitre.technique_id}
                                            onChange={(e) => setFormData({...formData, mitre: {...formData.mitre, technique_id: e.target.value}})}
                                            disabled={!isEditing}
                                            className="w-full bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Technique Name"
                                            value={formData.mitre.technique_name}
                                            onChange={(e) => setFormData({...formData, mitre: {...formData.mitre, technique_name: e.target.value}})}
                                            disabled={!isEditing}
                                            className="w-full bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Conditions */}
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2 flex justify-between">
                                        <span>Conditions (JSON Format)</span>
                                    </label>
                                    <textarea 
                                        value={conditionsText}
                                        onChange={(e) => setConditionsText(e.target.value)}
                                        disabled={!isEditing}
                                        rows={6}
                                        className="w-full bg-[#1e1e1e] font-mono text-sm border border-brand-border rounded p-3 text-slate-300 focus:border-brand-accent focus:outline-none disabled:opacity-75"
                                        placeholder='{ "message": "suspicious.*pattern" }'
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Edit conditions as a raw JSON object string.</p>
                                </div>
                                
                                {/* Confidence */}
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Confidence Score (0.0 - 1.0)</label>
                                    <input 
                                        type="number" 
                                        step="0.05"
                                        min="0"
                                        max="1"
                                        value={formData.confidence}
                                        onChange={(e) => setFormData({...formData, confidence: parseFloat(e.target.value)})}
                                        disabled={!isEditing}
                                        className="w-1/3 bg-brand-surface border border-brand-border rounded px-3 py-2 text-sm text-white focus:border-brand-accent focus:outline-none disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            Select a rule from the left to view or edit details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
