export interface DashboardModeProps {
 metrics: any;
 findings: any[];
 threatMapData: any[];
 liveFeed: any[];
 setMaximizedWidget: (w: 'map' | 'telemetry' | null) => void;
 maximizedWidget: 'map' | 'telemetry' | null;
 eventsRate: number;
}
