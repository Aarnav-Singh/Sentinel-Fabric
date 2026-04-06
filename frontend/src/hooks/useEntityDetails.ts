import { useState, useEffect } from 'react';

// This is a placeholder hook for fetching entity details.
// Once backend endpoints are established, replace with SWR or React Query hooks.
export function useEntityDetails(type: string | null, value: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type || !value) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Mock an API fetch:
    const fetchTimer = setTimeout(() => {
      setData({
        type,
        value,
        firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        frequency: Math.floor(Math.random() * 500) + 1,
        relatedEvents: Math.floor(Math.random() * 20) + 1,
        riskScore: Math.random(),
        recentEvents: [
          { time: Date.now() - 1000 * 60 * 5, message: `Log: Access attempt registered from ${value}`, severity: 'info' },
          { time: Date.now() - 1000 * 60 * 60, message: `Auth: Unusual pattern detected`, severity: 'medium' },
          { time: Date.now() - 1000 * 60 * 120, message: `Firewall: Blocked connection`, severity: 'high' }
        ],
        riskTrend: Array.from({ length: 7 }, (_, i) => ({
             day: `Day ${i + 1}`,
             score: Math.random() * 100
        })),
        sigmaMatches: [
          { ruleId: 'SIG-1049', name: 'Suspicious Execution Indicator', severity: 'high' },
          { ruleId: 'SIG-2911', name: 'Potential Lateral Movement', severity: 'critical' }
        ],
        qdrantSimilar: [
          { id: `sim-1`, value: type === 'ip' ? '192.168.1.104' : 'admin_backup', score: 0.94 },
          { id: `sim-2`, value: type === 'ip' ? '10.0.0.5' : 'sysadmin', score: 0.88 }
        ]
      });
      setLoading(false);
    }, 600);

    return () => clearTimeout(fetchTimer);
  }, [type, value]);

  return { data, loading, error };
}
