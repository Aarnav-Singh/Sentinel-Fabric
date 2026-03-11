/**
 * useLiveEvents — SSE connection manager for real-time dashboard updates.
 *
 * Connects to /api/stream/default, auto-reconnects on drop,
 * and updates React Query cache for targeted re-renders.
 */
"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseLiveEventsOptions {
    tenantId?: string;
    onEvent?: (event: Record<string, unknown>) => void;
}

export function useLiveEvents({ tenantId = "default", onEvent }: UseLiveEventsOptions = {}) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const connect = useCallback(() => {
        // Close any existing connection
        eventSourceRef.current?.close();
        clearTimeout(reconnectTimeoutRef.current);

        const es = new EventSource(`/api/stream/${tenantId}`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                onEvent?.(data);
            } catch {
                // Ignore heartbeat/malformed messages
            }
        };

        es.onerror = () => {
            es.close();
            // Reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };
    }, [tenantId, onEvent]);

    useEffect(() => {
        connect();
        return () => {
            eventSourceRef.current?.close();
            clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);
}
