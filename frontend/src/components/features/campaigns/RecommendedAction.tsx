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
            className="rounded-lg mt-2 animate-sf-fadeIn"
            style={{
                background: "#0a1628",
                border: "1px solid #1e3a5f",
                borderTop: "2px solid #00d4c8",
                padding: "16px 20px",
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#00d4c8", boxShadow: "0 0 8px #00d4c8" }}
                />
                <span className="text-[11px] font-space text-sf-teal tracking-widest">
                    AI RECOMMENDED ACTION · {campaign.id}
                </span>
            </div>

            {/* Recommendation text */}
            <div
                className="text-xs font-space leading-relaxed rounded-md mb-3.5 p-3"
                style={{
                    color: "#e8f4f8",
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
                        <Chip key={t} label={t} color="#b57aff" />
                    ))}
                </div>
                <div className="flex-1" />
                <button
                    onClick={onDismiss}
                    className="px-3.5 py-1.5 text-xs bg-transparent border border-sf-border text-sf-text-secondary rounded-[5px] cursor-pointer hover:border-sf-text-muted transition-colors"
                >
                    Dismiss
                </button>
                <button
                    onClick={onModify}
                    className="px-3.5 py-1.5 text-xs bg-transparent border rounded-[5px] cursor-pointer hover:bg-sf-amber/10 transition-colors"
                    style={{ borderColor: "rgba(255,170,0,0.4)", color: "#ffaa00" }}
                >
                    Modify
                </button>
                <button
                    onClick={onApprove}
                    className="px-5 py-1.5 text-xs font-bold border-none rounded-[5px] cursor-pointer transition-all"
                    style={{
                        background: "linear-gradient(135deg, #00d4c8, #00a89e)",
                        color: "#050d1a",
                        boxShadow: "0 0 16px rgba(0,212,200,0.4)",
                    }}
                >
                    ✓ Approve & Execute
                </button>
            </div>
        </div>
    );
}
