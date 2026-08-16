"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function IntegrationsPage() {
  // SIEM Integration states
  const [esUrl, setEsUrl] = useState("");
  const [indexName, setIndexName] = useState("");
  const [siemStatus, setSiemStatus] = useState<"not_configured" | "connected">("not_configured");

  // Webhook states
  const [endpointUrl, setEndpointUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [triggerOn, setTriggerOn] = useState("all");
  const [webhookSaved, setWebhookSaved] = useState(false);

  const handleConnectSIEM = () => {
    if (!esUrl) {
      toast.error("Elasticsearch URL is required.");
      return;
    }
    if (!indexName) {
      toast.error("Index name is required.");
      return;
    }
    setSiemStatus("connected");
    toast.success("SIEM connected successfully. Alerts will forward automatically.");
  };

  const handleSaveWebhook = () => {
    if (!endpointUrl) {
      toast.error("Endpoint URL is required.");
      return;
    }
    if (!secretKey) {
      toast.error("Secret key is required.");
      return;
    }
    setWebhookSaved(true);
    toast.success("Webhook saved. Payloads will fire on the selected trigger.");
    setTimeout(() => setWebhookSaved(false), 3000);
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
                disabled={!esUrl || !indexName}
                size="sm"
                className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                Connect
              </Button>
            </div>
          </div>
        </Card>

        {/* Webhook Card */}
        <Card className="p-6 bg-card border-border shadow-none flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Webhook</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send alert payloads to external API endpoints.
            </p>
          </div>
          <div className="h-px bg-border w-full" />

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Endpoint URL
              </label>
              <Input
                type="text"
                placeholder="https://api.mycompany.com/webhook"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="h-9 rounded-xl border-border focus-visible:ring-ring bg-background"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Secret Key
              </label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="h-9 rounded-xl border-border focus-visible:ring-ring bg-background"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trigger on
              </label>
              <Select value={triggerOn} onValueChange={setTriggerOn}>
                <SelectTrigger className="h-9 rounded-xl border-border focus:ring-ring bg-background text-xs">
                  <SelectValue placeholder="Select trigger event" />
                </SelectTrigger>
                <SelectContent className="border-border rounded-xl">
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="critical">Critical Alerts Only</SelectItem>
                  <SelectItem value="incidents">Incidents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <div className="text-xs text-muted-foreground">
                {webhookSaved && (
                  <span className="flex items-center gap-1 text-emerald-500 font-medium animate-in fade-in duration-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved successfully
                  </span>
                )}
              </div>
              <Button
                onClick={handleSaveWebhook}
                disabled={!endpointUrl || !secretKey}
                size="sm"
                className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                Save
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
