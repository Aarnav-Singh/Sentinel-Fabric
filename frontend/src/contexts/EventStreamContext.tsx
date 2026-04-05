"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import useSWR from "swr";
import { useLiveEvents } from "@/hooks/useLiveEvents";

interface PipelineStatus {
    pipeline_active: boolean;
    events_processed: number;
}

interface EventStreamContextType {
    lastEvent: Record<string, unknown> | null;
    eventsRate: number;
    pipelineStatus: PipelineStatus | null;
}

const EventStreamContext = createContext<EventStreamContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function EventStreamProvider({ children }: { children: React.ReactNode }) {
    const [lastEvent, setLastEvent] = useState<Record<string, unknown> | null>(null);
    const [eventsRate, setEventsRate] = useState(0);
    const [lastEventCount, setLastEventCount] = useState(0);

    const { data: pipelineStatus } = useSWR<PipelineStatus>('/api/proxy/api/v1/pipeline/status', fetcher, { 
        refreshInterval: 5000,
        keepPreviousData: true
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

    useLiveEvents({
        onEvent: (event) => setLastEvent(event)
    });

    return (
        <EventStreamContext.Provider value={{ lastEvent, eventsRate, pipelineStatus: pipelineStatus || null }}>
            {children}
        </EventStreamContext.Provider>
    );
}

export function useEventStream() {
    const context = useContext(EventStreamContext);
    if (context === undefined) {
        throw new Error("useEventStream must be used within an EventStreamProvider");
    }
    return context;
}
