"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Globe,
  Smartphone,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Laptop,
  Camera,
  Router,
  Tv,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

interface Site {
  id: number;
  name: string;
  domain: string;
  ip_address: string;
  is_active: boolean;
}

interface Device {
  id: number;
  name: string;
  ip_address: string;
  device_type: string;
  is_active: boolean;
}

export default function SourcesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addType, setAddType] = useState<"website" | "device" | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [domain, setDomain] = useState("");
  const [deviceType, setDeviceType] = useState("laptop");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const [sitesRes, devicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sites/`),
        fetch(`${API_BASE_URL}/devices/`),
      ]);
      if (sitesRes.ok) setSites(await sitesRes.ok ? await sitesRes.json() : []);
      if (devicesRes.ok) setDevices(await devicesRes.ok ? await devicesRes.json() : []);
    } catch {
      toast.error("Failed to load sources. Check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const openAddModal = (type: "website" | "device") => {
    setAddType(type);
    setName("");
    setIpAddress("");
    setDomain("");
    setDeviceType("laptop");
    setError(null);
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Name is required."); return; }
    if (!ipAddress) { toast.error("IP address is required."); return; }
    if (addType === "website" && !domain) { toast.error("Domain is required."); return; }

    setSubmitting(true);
    setError(null);

    const url = addType === "website" ? `${API_BASE_URL}/sites/` : `${API_BASE_URL}/devices/`;
    const payload = addType === "website"
      ? { name, domain, ip_address: ipAddress }
      : { name, ip_address: ipAddress, device_type: deviceType };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || errData?.message || "Failed to add source");
      }

      await fetchSources();
      setAddType(null);
      toast.success(`${addType === "website" ? "Website" : "Device"} "${name}" added successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSource = async (type: "website" | "device", id: number, sourceName: string) => {
    const url = type === "website" ? `${API_BASE_URL}/sites/${id}/` : `${API_BASE_URL}/devices/${id}/`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        await fetchSources();
        toast.success(`"${sourceName}" has been removed.`);
      } else {
        toast.error(`Failed to delete "${sourceName}". Please try again.`);
      }
    } catch {
      toast.error(`Error removing "${sourceName}". Check your backend connection.`);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "laptop":
        return <Laptop className="h-3.5 w-3.5" />;
      case "camera":
        return <Camera className="h-3.5 w-3.5" />;
      case "router":
        return <Router className="h-3.5 w-3.5" />;
      case "doorbell":
        return <Tv className="h-3.5 w-3.5" />;
      case "phone":
        return <Smartphone className="h-3.5 w-3.5" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your network assets and websites under monitoring.
        </p>
      </div>

      <Card className="p-6 bg-card border-border shadow-none flex flex-col gap-5">
        {/* Header section */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Registered Sources</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => openAddModal("website")}
              size="sm"
              className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Website
            </Button>
            <Button
              onClick={() => openAddModal("device")}
              size="sm"
              className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Device
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border w-full" />

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Websites Column */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Websites
                </span>
                <div className="flex flex-col gap-2.5">
                  {sites.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-16 text-center border border-dashed border-border rounded-xl">
                      No websites registered
                    </div>
                  ) : (
                    sites.map((site) => (
                      <div
                        key={site.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/50 hover:border-border transition"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">{site.name}</span>
                            {site.is_active && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{site.domain}</span>
                            <span>•</span>
                            <span>{site.ip_address}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDeleteSource("website", site.id, site.name)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Devices Column */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Devices
                </span>
                <div className="flex flex-col gap-2.5">
                  {devices.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-16 text-center border border-dashed border-border rounded-xl">
                      No devices registered
                    </div>
                  ) : (
                    devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/50 hover:border-border transition"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {getDeviceIcon(device.device_type)}
                            <span className="text-sm font-semibold text-foreground">{device.name}</span>
                            {device.is_active && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span className="capitalize">{device.device_type}</span>
                            <span>•</span>
                            <span>{device.ip_address}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDeleteSource("device", device.id, device.name)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Verdict Box at bottom */}
        <div className="mt-4 p-4 rounded-xl border border-dashed border-border/80 bg-background/30 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Status Verdict:</span> Fully monitoring{" "}
          <span className="font-semibold text-foreground">{sites.length} website{sites.length !== 1 && "s"}</span> and{" "}
          <span className="font-semibold text-foreground">{devices.length} device{devices.length !== 1 && "s"}</span>.
          Traffic ingesting through these sources is actively classified by the Watchtower threat detection pipeline.
        </div>
      </Card>

      {/* Add Modal */}
      <Dialog open={addType !== null} onOpenChange={(open) => !open && setAddType(null)}>
        <DialogContent className="border-border bg-card rounded-2xl max-w-sm p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Add New {addType === "website" ? "Website" : "Device"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSource} className="flex flex-col gap-4 mt-3">
            {error && (
              <div className="flex items-center gap-1.5 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Name
              </label>
              <Input
                type="text"
                placeholder="e.g. My Website"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-xl border-border bg-background text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                IP Address
              </label>
              <Input
                type="text"
                placeholder="e.g. 192.168.1.100"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="h-9 rounded-xl border-border bg-background text-sm font-mono"
                required
              />
            </div>

            {addType === "website" ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Domain
                </label>
                <Input
                  type="text"
                  placeholder="e.g. website.local"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-9 rounded-xl border-border bg-background text-sm"
                  required
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Device Type
                </label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger className="h-9 rounded-xl border-border bg-background text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="border-border rounded-xl">
                    <SelectItem value="laptop">Laptop / Workstation</SelectItem>
                    <SelectItem value="camera">IP Camera</SelectItem>
                    <SelectItem value="router">Router / Switch</SelectItem>
                    <SelectItem value="doorbell">IP Doorbell</SelectItem>
                    <SelectItem value="phone">Mobile Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddType(null)}
                className="rounded-full h-8 px-4 font-medium text-xs hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full h-8 px-4 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                Add Source
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
