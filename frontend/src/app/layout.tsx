import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { EventStreamProvider } from "@/contexts/EventStreamContext";
import { ToastProvider } from "@/components/ui/Toast";
import { EntityProvider } from "@/contexts/EntityContext";
import { EntityPanel } from "@/components/features/investigation/EntityPanel";
import { CommandPaletteProvider } from "@/contexts/CommandPaletteContext";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThreatStateProvider } from "@/contexts/ThreatStateContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
 title: "UMBRIX | Command Center",
 description: "Turns security tool noise into attack campaign narratives.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" className="dark h-full bg-ng-base">
 <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased h-full flex flex-col overflow-hidden selection:bg-ng-cyan-bright/30 text-ng-on bg-ng-base`}>
 <ErrorBoundary>
 <QueryProvider>
 <ToastProvider>
 <ThreatStateProvider>
 <CommandPaletteProvider>
 <EntityProvider>
 <EventStreamProvider>
 <AppLayout>
 {children}
 <EntityPanel />
 <CommandPalette />
 </AppLayout>
 </EventStreamProvider>
 </EntityProvider>
 </CommandPaletteProvider>
 </ThreatStateProvider>
 </ToastProvider>
 </QueryProvider>
 </ErrorBoundary>
 </body>
 </html>
 );
}
