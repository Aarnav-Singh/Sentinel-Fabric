import { useState, useEffect, useCallback } from 'react';

interface EntityEvent {
  time?: number | string;
  timestamp?: string;
  message?: string;
  severity?: string;
  action?: string;
  meta_score?: number;
  source_type?: string;
}

interface SigmaMatch {
  ruleId: string;
  name: string;
  severity: string;
  hits?: number;
}

interface SimilarEntity {
  id: string;
  value: string;
  score: number;
}

interface RiskTrendPoint {
  day: string;
  score: number;
}

interface EntityDetailsData {
  type: string;
  value: string;
  firstSeen: string | null;
  lastSeen: string | null;
  frequency: number;
  relatedEvents: number;
  riskScore: number;
  recentEvents: EntityEvent[];
  riskTrend: RiskTrendPoint[];
  sigmaMatches: SigmaMatch[];
  qdrantSimilar: SimilarEntity[];
  findings: any[];
}

/**
 * Fetches real entity details from the backend API.
 *
 * Data sources (aggregated on the backend):
 *   - ClickHouse → event frequency, first/last seen, recent events, risk trend
 *   - Qdrant     → similar entities via behavioral DNA vector search
 *   - PostgreSQL → associated findings (analyst verdicts)
 */
export function useEntityDetails(type: string | null, value: string | null) {
  const [data, setData] = useState<EntityDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!type || !value) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedValue = encodeURIComponent(value);
      const resp = await fetch(
        `/api/proxy/api/v1/entities/${type}/${encodedValue}?hours=168&limit=10`,
      );

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const json = await resp.json();

      // Normalize recentEvents to have a consistent `time` field
      const recentEvents = (json.recentEvents || []).map((evt: any) => ({
        ...evt,
        time: evt.time || evt.timestamp || Date.now(),
        message: evt.message || evt.action || '—',
        severity: evt.severity || 'info',
      }));

      setData({
        type: json.type || type,
        value: json.value || value,
        firstSeen: json.firstSeen || null,
        lastSeen: json.lastSeen || null,
        frequency: json.frequency ?? 0,
        relatedEvents: json.relatedEvents ?? json.frequency ?? 0,
        riskScore: json.riskScore ?? 0,
        recentEvents,
        riskTrend: json.riskTrend || [],
        sigmaMatches: json.sigmaMatches || [],
        qdrantSimilar: json.qdrantSimilar || [],
        findings: json.findings || [],
      });
    } catch (err: any) {
      console.error('[useEntityDetails] fetch failed, falling back to empty state', err);
      setError(err.message || 'Failed to fetch entity details');

      // Provide empty data structure so the panel still renders
      setData({
        type: type,
        value: value,
        firstSeen: null,
        lastSeen: null,
        frequency: 0,
        relatedEvents: 0,
        riskScore: 0,
        recentEvents: [],
        riskTrend: [],
        sigmaMatches: [],
        qdrantSimilar: [],
        findings: [],
      });
    } finally {
      setLoading(false);
    }
  }, [type, value]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { data, loading, error };
}
