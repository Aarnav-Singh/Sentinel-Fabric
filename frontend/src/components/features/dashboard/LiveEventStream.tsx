"use client";

import { Chip } from "@/components/ui/Chip";

export interface LiveEvent {
    time: string;
    tool: string;
    msg: string;
    score: number;
    campaign?: string;
}

interface LiveEventStreamProps {
    events: LiveEvent[];
}

function scoreColor(score: number): string {
    if (score > 0.8) return "var(--sf-critical)";
    if (score > 0.6) return "var(--sf-warning)";
    return "var(--sf-accent)";
}

export function LiveEventStream({ events }: LiveEventStreamProps) {
    return (
        <div className="flex-1 overflow-hidden flex flex-col">
            <div
                className="flex items-center gap-2 border-b border-sf-border text-[11px] font-space text-sf-text-secondary tracking-widest uppercase"
                style={{ padding: "12px 16px 8px" }}
            >
                <div className="w-1.5 h-1.5 rounded-full bg-sf-green animate-sf-blink" />
                Live Event Stream
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: "8px 0" }}>
                {events.map((ev, i) => (
                    <div
                        key={i}
                        className="animate-sf-fadeIn border-b"
                        style={{
                            padding: "7px 16px",
                            borderColor: "rgba(26,46,74,0.3)",
                            animationDelay: `${i * 0.05}s`,
                        }}
                    >
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] text-sf-text-muted font-space">{ev.time}</span>
                            <Chip label={ev.tool} color="var(--sf-bg)" />
                            <div className="ml-auto">
                                <span className="text-[10px] font-space" style={{ color: scoreColor(ev.score) }}>
                                    {Math.round(ev.score * 100)}
                                </span>
                            </div>
                        </div>
                        <div className="text-[11px] text-sf-text-secondary leading-snug">{ev.msg}</div>
                        {ev.campaign && (
                            <div className="text-[9px] text-sf-teal-dim mt-0.5 font-space">→ {ev.campaign}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
