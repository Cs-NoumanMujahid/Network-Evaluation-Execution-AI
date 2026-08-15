// Centralised API helpers. The dashboard polling hook uses its own fetch logic;
// these helpers are for on-demand, page-specific data needs.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface AlertResultLite {
  id: number | string;
  timestamp: string;
  prediction: string;
  severity: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: number;
  confidence: number;
  source_type: string;
  recommended_action?: string;
}

export interface AlertResultFull extends AlertResultLite {
  // Extra flow metrics returned by /api/alerts/<id>/
  flow_duration?: number;
  flow_bytes_per_sec?: number;
  flow_packets_per_sec?: number;
  total_fwd_packets?: number;
  total_bwd_packets?: number;
  is_alert?: boolean;
  registered_id?: string | null;
  created_at?: string;
}

export interface TopTarget {
  dst_ip: string;
  count: number;
  ports: number[];
  attack_types: string[];
  last_seen: string | null;
}

/**
 * Fetch alerts triggered from a specific source IP. Returns up to `limit` rows.
 * Used by the Incidents page to drill into a single attacker.
 */
export async function fetchAlertsBySource(
  src_ip: string,
  limit = 20,
): Promise<AlertResultLite[]> {
  try {
    const r = await fetch(
      `${API_BASE_URL}/alerts/?src_ip=${encodeURIComponent(src_ip)}&limit=${limit}`,
    );
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single alert with the full FlowRecord (incl. flow metrics like
 * flow_duration, flow_bytes_per_sec, packets/sec). Used by the Alerts page
 * detail modal to surface deep inspection data.
 */
export async function fetchAlertDetail(
  id: number | string,
): Promise<AlertResultFull | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/alerts/${id}/`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * Fetch top destination IPs by alert count. Used by the Reports page.
 */
export async function fetchTopTargets(
  limit = 5,
  sourceType?: string,
): Promise<TopTarget[]> {
  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (sourceType) qs.set("source_type", sourceType);
    const r = await fetch(`${API_BASE_URL}/dashboard/top-targets/?${qs.toString()}`);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.targets) ? data.targets : [];
  } catch {
    return [];
  }
}
