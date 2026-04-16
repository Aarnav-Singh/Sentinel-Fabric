"use client";

import { Chip } from "@/components/ui/Chip";
import type { Campaign } from "./CampaignCard";

interface RecommendedActionProps {
    campaign: Campaign;
    onApprove?: () => void;
    onModify?: () => void;
    onDismiss?: () => void;
}

export function RecommendedAction({ campaign, onApprove, onModify, onDismiss }: RecommendedActionProps) {
    return (
        <div
            className="rounded-none mt-2 animate-sf-fadeIn"
            style={{
                background: "var(--sf-bg)",
                border: "1px solid var(--sf-bg)",
                borderTop: "2px solid var(--sf-accent)",
                padding: "16px 20px",
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--sf-accent)", boxShadow: "0 0 8px var(--sf-accent)" }}
                />
                <span className="text-[11px] font-space text-sf-teal tracking-widest">
                    AI RECOMMENDED ACTION · {campaign.id}
                </span>
            </div>

            {/* Recommendation text */}
            <div
                className="text-xs font-space leading-relaxed rounded-md mb-3.5 p-3"
                style={{
                    color: "var(--sf-bg)",
                    background: "rgba(0,212,200,0.05)",
                    border: "1px solid rgba(0,212,200,0.2)",
                }}
            >
                {campaign.recommendation}
            </div>

            {/* MITRE tags + action buttons */}
            <div className="flex gap-2 items-center">
                <div className="flex gap-1.5">
                    {campaign.mitre.map((t) => (
                        <Chip key={t} label={t} color="var(--sf-accent-2)" />
                    ))}
                </div>
                <div className="flex-1" />
                <button
                    onClick={onDismiss}
                    className="px-3.5 py-1.5 text-xs bg-transparent border border-sf-border text-sf-muted rounded-[5px] cursor-pointer hover:border-sf-muted transition-colors"
                >
                    Dismiss
                </button>
                <button
                    onClick={onModify}
                    className="px-3.5 py-1.5 text-xs bg-transparent border rounded-[5px] cursor-pointer hover:bg-sf-amber/10 transition-colors"
                    style={{ borderColor: "rgba(255,170,0,0.4)", color: "var(--sf-warning)" }}
                >
                    Modify
                </button>
                <button
                    onClick={onApprove}
                    className="px-5 py-1.5 text-xs font-bold border-none rounded-[5px] cursor-pointer transition-all"
                    style={{
                        background: "linear-gradient(135deg, var(--sf-accent), var(--sf-safe))",
                        color: "var(--sf-bg)",
                        boxShadow: "0 0 16px rgba(0,212,200,0.4)",
                    }}
                >
                    ✓ Approve & Execute
                </button>
            </div>
        </div>
    );
}
