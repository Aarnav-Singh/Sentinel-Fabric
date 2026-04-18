/**
 * React Query Provider — wraps the app to enable data fetching hooks.
 */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
 const [queryClient] = useState(
 () =>
 new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 10_000, // 10 seconds
 refetchInterval: 30_000, // Heartbeat fallback
 retry: 2,
 refetchOnWindowFocus: false,
 },
 },
 })
 );

 return (
 <QueryClientProvider client={queryClient}>
 {children}
 </QueryClientProvider>
 );
}
