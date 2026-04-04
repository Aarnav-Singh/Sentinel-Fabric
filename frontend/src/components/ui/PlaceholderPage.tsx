import { TerminalSquare } from "lucide-react";

export function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-display font-bold text-text-primary tracking-wide">{title}</h1>
                <p className="text-text-secondary mt-2 text-sm">Module provisioning in progress.</p>
            </header>

            <div className="bg-surface-card border border-surface-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
                <TerminalSquare className="w-12 h-12 text-sf-warning mb-4 opacity-80" />
                <h2 className="text-lg font-bold text-text-primary mb-2">Under Construction</h2>
                <p className="text-text-muted text-sm text-center max-w-md">
                    This module is part of the UMBRIX roadmap. Interface and data integration are currently being provisioned.
                </p>
            </div>
        </div>
    );
}
