"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileText, Database } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";

export default function IntegrationsPage() {
  // SIEM Integration states
  const [esUrl, setEsUrl] = useState("http://localhost:9200");
  const [indexName, setIndexName] = useState("nexa-flows");
  const [siemStatus, setSiemStatus] = useState<"not_configured" | "connected">("not_configured");
  const [connectedUrl, setConnectedUrl] = useState("");
  const [connectedIndex, setConnectedIndex] = useState("");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"json" | "syslog" | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/siem/config/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.es_url) {
          setEsUrl(data.es_url);
          setConnectedUrl(data.es_url);
        }
        if (data.index_name) {
          setIndexName(data.index_name);
          setConnectedIndex(data.index_name);
        }
        if (data.is_connected) setSiemStatus("connected");
        if (data.last_synced) setLastSynced(data.last_synced);
      })
      .catch((err) => console.error("Error fetching SIEM config:", err));
  }, []);

  const handleConnectSIEM = async () => {
    if (!esUrl) {
      toast.error("Elasticsearch URL is required.");
      return;
    }
    if (!indexName) {
      toast.error("Index name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/siem/config/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ es_url: esUrl, index_name: indexName }),
      });
      if (res.ok) {
        const data = await res.json();
        setSiemStatus("connected");
        setConnectedUrl(esUrl);
        setConnectedIndex(indexName);
        setLastSynced(data.last_synced);
        toast.success("SIEM connected successfully. Telemetry forwarding active.");
      } else {
        toast.error("Failed to save SIEM configuration.");
      }
    } catch {
      toast.error("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const isConnectedAndUnchanged =
    siemStatus === "connected" &&
    esUrl.trim() === connectedUrl.trim() &&
    indexName.trim() === connectedIndex.trim();

  const handleDownloadExport = async (format: "json" | "syslog") => {
    setExporting(format);
    try {
      const res = await fetch(`${API_BASE_URL}/siem/export/?export_format=${format}&limit=500`);
      if (!res.ok) {
        toast.error("Failed to export SIEM telemetry.");
        return;
      }

      if (format === "json") {
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          toast.info("No alerts found to export.");
          return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexa_siem_alerts_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${data.length} alert(s) in JSON (ECS) format.`);
      } else {
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          toast.info("No alerts found to export.");
          return;
        }
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexa_siem_alerts_${new Date().toISOString().slice(0, 10)}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Exported alert(s) in CEF / Syslog format.");
      }
    } catch {
      toast.error("Export request failed.");
    } finally {
      setExporting(null);
    }
  };



  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your threat detection pipeline to external services and notification systems.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* SIEM Integration Card */}
        <Card className="p-6 bg-card border-border shadow-none flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">SIEM Integration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Forward event logs and telemetry to Elasticsearch.
            </p>
          </div>
          <div className="h-px bg-border w-full" />
          
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Elasticsearch URL
              </label>
              <Input
                type="text"
                placeholder="http://localhost:9200"
                value={esUrl}
                onChange={(e) => setEsUrl(e.target.value)}
                className="h-9 rounded-xl border-border focus-visible:ring-ring bg-background"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Index Name
              </label>
              <Input
                type="text"
                placeholder="nexa-flows"
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
                className="h-9 rounded-xl border-border focus-visible:ring-ring bg-background"
              />
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  {siemStatus === "connected" ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-500">Connected</span>
                      {lastSynced && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (Synced: {new Date(lastSynced).toLocaleTimeString()})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">Not configured</span>
                    </>
                  )}
                </span>
              </div>
              <Button
                onClick={handleConnectSIEM}
                disabled={loading || !esUrl || !indexName || isConnectedAndUnchanged}
                size="sm"
                className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? "Connecting..." : isConnectedAndUnchanged ? "Connected" : "Connect"}
              </Button>

            </div>
          </div>
        </Card>

        {/* SIEM Telemetry & Log Export Card */}
        <Card className="p-6 bg-card border-border shadow-none flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              SIEM Log & Telemetry Export
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export classified threat alerts and flow telemetry in standard SIEM formats for ingestion into Splunk, Elastic, QRadar, or Wazuh.
            </p>
          </div>
          <div className="h-px bg-border w-full" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Elastic Common Schema (JSON)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Structured JSON adhering to the Elastic ECS specification. Compatible with Elasticsearch, Logstash, and Splunk HEC.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting !== null}
                onClick={() => handleDownloadExport("json")}
                className="rounded-full h-8 text-xs font-medium gap-1.5 w-fit border-border hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting === "json" ? "Exporting..." : "Export JSON (ECS)"}
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Common Event Format (CEF / Syslog)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Standard RFC 5424 CEF syslog format. Compatible with ArcSight, AlienVault, Wazuh, and generic syslog daemons.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting !== null}
                onClick={() => handleDownloadExport("syslog")}
                className="rounded-full h-8 text-xs font-medium gap-1.5 w-fit border-border hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting === "syslog" ? "Exporting..." : "Export Syslog (CEF)"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

