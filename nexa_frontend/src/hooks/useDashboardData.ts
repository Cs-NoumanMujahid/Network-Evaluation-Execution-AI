import { useState, useEffect, useCallback } from "react";
import { useSource } from "@/components/providers/SourceContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000/ws/dashboard/";

interface DashboardStats {
  total_flows: number;
  total_alerts: number;
  active_alerts: number;
  detection_rate: number;
  benign_flows: number;
}

interface AttackTypesData {
  labels: string[];
  values: number[];
}

interface SeverityData {
  labels: string[];
  values: number[];
}

interface TrafficVolumeData {
  labels: string[];
  flows: number[];
  alerts: number[];
}

interface TopAttacker {
  src_ip: string;
  count: number;
  attack_types: string[];
}

interface TopAttackersData {
  attackers: TopAttacker[];
}

interface PipelineServiceStatus {
  status: boolean;
  label?: string;
  last_seen?: string;
}

interface PipelineStatusData {
  kafka: PipelineServiceStatus;
  ml_consumer: PipelineServiceStatus;
  cicflowmeter: PipelineServiceStatus;
  tcpdump: PipelineServiceStatus;
  flows_per_minute: number;
  alerts_per_minute: number;
}

interface AlertResult {
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
  recommended_action: string;
}

interface AlertsData {
  count: number;
  next: string | null;
  previous: string | null;
  results: AlertResult[];
}

const MOCK_DATA = {
  stats: {
    total_flows: 1500,
    total_alerts: 320,
    active_alerts: 24,
    detection_rate: 21.33,
    benign_flows: 1180,
  },
  attackTypes: {
    labels: ["Benign", "PortScan", "SQL-Injection", "BruteForce-Web", "DoS-Slowloris"],
    values: [1180, 150, 80, 60, 30],
  },
  severity: {
    labels: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL"],
    values: [45, 80, 120, 30, 1180],
  },
  trafficVolume: {
    labels: ["12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30"],
    flows: [45, 67, 120, 89, 210, 150, 180],
    alerts: [2, 5, 15, 8, 32, 10, 12],
  },
  topAttackers: {
    attackers: [
      { src_ip: "172.20.0.200", count: 450, attack_types: ["PortScan", "SQLi"] },
      { src_ip: "10.0.0.5", count: 120, attack_types: ["BruteForce-Web"] },
      { src_ip: "192.168.1.100", count: 85, attack_types: ["DoS"] },
      { src_ip: "10.10.10.10", count: 45, attack_types: ["SSH-Bruteforce"] },
      { src_ip: "172.16.0.50", count: 20, attack_types: ["XSS"] },
    ],
  },
  pipelineStatus: {
    kafka: { status: true, label: "Running" },
    ml_consumer: { status: true, label: "Running", last_seen: new Date().toISOString() },
    cicflowmeter: { status: true, label: "Running" },
    tcpdump: { status: true, label: "Running" },
    flows_per_minute: 45,
    alerts_per_minute: 3,
  },
  alerts: {
    count: 320,
    next: "/api/alerts/?page=2",
    previous: null,
    results: [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        prediction: "PortScan",
        severity: "CRITICAL",
        src_ip: "172.20.0.200",
        dst_ip: "172.20.0.10",
        dst_port: 80,
        protocol: 6,
        confidence: 0.99,
        source_type: "website",
        recommended_action: "Block source IP in firewall.",
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        prediction: "SQL-Injection",
        severity: "HIGH",
        src_ip: "172.20.0.200",
        dst_ip: "10.0.0.5",
        dst_port: 443,
        protocol: 6,
        confidence: 0.85,
        source_type: "website",
        recommended_action: "Inspect web server logs for SQLi attempts.",
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        prediction: "BruteForce-Web",
        severity: "MEDIUM",
        src_ip: "10.0.0.5",
        dst_ip: "192.168.1.50",
        dst_port: 80,
        protocol: 6,
        confidence: 0.76,
        source_type: "home_network",
        recommended_action: "Implement rate limiting on login endpoint.",
      },
    ],
  },
};

export const useDashboardData = () => {
  const { sourceType } = useSource();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attackTypes, setAttackTypes] = useState<AttackTypesData | null>(null);
  const [severity, setSeverity] = useState<SeverityData | null>(null);
  const [trafficVolume, setTrafficVolume] = useState<TrafficVolumeData | null>(null);
  const [topAttackers, setTopAttackers] = useState<TopAttackersData | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const applyMockData = useCallback(() => {
    setStats(MOCK_DATA.stats);
    setAttackTypes(MOCK_DATA.attackTypes);
    setSeverity(MOCK_DATA.severity);
    setTrafficVolume(MOCK_DATA.trafficVolume);
    setTopAttackers(MOCK_DATA.topAttackers);
    setPipelineStatus(MOCK_DATA.pipelineStatus);
    setAlerts(MOCK_DATA.alerts);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        attackTypesRes,
        severityRes,
        trafficVolumeRes,
        topAttackersRes,
        pipelineStatusRes,
        alertsRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard/stats/?source_type=${sourceType}`).catch(() => null),
        fetch(`${API_BASE_URL}/dashboard/attack-types/?source_type=${sourceType}`).catch(() => null),
        fetch(`${API_BASE_URL}/dashboard/severity/?source_type=${sourceType}`).catch(() => null),
        fetch(`${API_BASE_URL}/dashboard/traffic-volume/?source_type=${sourceType}&minutes=60`).catch(() => null),
        fetch(`${API_BASE_URL}/dashboard/top-attackers/?source_type=${sourceType}&limit=5`).catch(() => null),
        fetch(`${API_BASE_URL}/dashboard/pipeline-status/`).catch(() => null),
        fetch(`${API_BASE_URL}/alerts/?source_type=${sourceType}&page=${page}&limit=${pageSize}`).catch(() => null),
      ]);

      const allFailed = ![statsRes, attackTypesRes, severityRes, trafficVolumeRes, topAttackersRes, pipelineStatusRes, alertsRes].some((res) => res && res.ok);

      if (allFailed) {
        applyMockData();
      } else {
        if (statsRes?.ok) setStats(await statsRes.json());
        if (attackTypesRes?.ok) setAttackTypes(await attackTypesRes.json());
        if (severityRes?.ok) setSeverity(await severityRes.json());
        if (trafficVolumeRes?.ok) setTrafficVolume(await trafficVolumeRes.json());
        if (topAttackersRes?.ok) setTopAttackers(await topAttackersRes.json());
        if (pipelineStatusRes?.ok) setPipelineStatus(await pipelineStatusRes.json());
        if (alertsRes?.ok) setAlerts(await alertsRes.json());
      }
    } catch (error) {
      console.error("Fetch error:", error);
      applyMockData();
    } finally {
      setLoading(false);
    }
  }, [sourceType, page, pageSize, applyMockData]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const ws = new WebSocket(WS_BASE_URL);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "dashboard_update") {
          setStats((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              total_flows: data.total_flows ?? prev.total_flows,
              total_alerts: data.total_alerts ?? prev.total_alerts,
              active_alerts: data.active_alerts ?? prev.active_alerts,
              detection_rate: data.detection_rate ?? prev.detection_rate,
            };
          });

          if (data.pipeline_status) {
            setPipelineStatus(data.pipeline_status);
          }

          if (data.latest_alerts && data.latest_alerts.length > 0) {
            setAlerts((prev) => {
              if (!prev) return prev;
              
              const existingIds = new Set(prev.results.map((a) => a.id));
              const uniqueNewAlerts = data.latest_alerts.filter((a: AlertResult) => !existingIds.has(a.id));
              
              if (uniqueNewAlerts.length === 0) return prev;

              const newResults = [...uniqueNewAlerts, ...prev.results].slice(0, 100);
              return { ...prev, results: newResults, count: prev.count + uniqueNewAlerts.length };
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    ws.onerror = () => {
    };

    return () => {
      ws.close();
    };
  }, []);

  return {
    stats,
    attackTypes,
    severity,
    trafficVolume,
    topAttackers,
    pipelineStatus,
    alerts,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
};
