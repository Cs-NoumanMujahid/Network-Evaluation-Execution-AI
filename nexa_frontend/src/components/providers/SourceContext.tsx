"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api";

type SourceType = "website" | "home_network";

export interface RegisteredSiteItem {
  id: number;
  name: string;
  domain: string;
  ip_address: string;
  is_active: boolean;
  registered_at?: string;
}

interface SourceContextType {
  sourceType: SourceType;
  setSourceType: (type: SourceType) => void;
  activeSite: RegisteredSiteItem | null;
  setActiveSite: (site: RegisteredSiteItem | null) => void;
  sites: RegisteredSiteItem[];
  refreshSites: () => Promise<void>;
  activateSite: (siteId: number) => Promise<boolean>;
}

const SourceContext = createContext<SourceContextType | undefined>(undefined);

export const SourceProvider = ({ children }: { children: ReactNode }) => {
  const [sourceType, setSourceType] = useState<SourceType>("website");
  const [sites, setSites] = useState<RegisteredSiteItem[]>([]);
  const [activeSite, setActiveSite] = useState<RegisteredSiteItem | null>(null);

  const refreshSites = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sites/`);
      if (res.ok) {
        const data = await res.json();
        const list: RegisteredSiteItem[] = Array.isArray(data) ? data : (data.results || []);
        setSites(list);

        const active = list.find((s) => s.is_active) || list[0] || null;
        setActiveSite((prev) => {
          if (!prev) return active;
          const stillExists = list.find((s) => s.id === prev.id);
          return stillExists || active;
        });
      }
    } catch (e) {
      console.error("Failed to load sites:", e);
    }
  }, []);

  useEffect(() => {
    refreshSites();
  }, [refreshSites]);

  const activateSite = async (siteId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/sites/${siteId}/activate/`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSites();
        const target = sites.find((s) => s.id === siteId);
        if (target) {
          setActiveSite(target);
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to activate site:", e);
    }
    return false;
  };

  return (
    <SourceContext.Provider
      value={{
        sourceType,
        setSourceType,
        activeSite,
        setActiveSite,
        sites,
        refreshSites,
        activateSite,
      }}
    >
      {children}
    </SourceContext.Provider>
  );
};

export const useSource = () => {
  const context = useContext(SourceContext);
  if (!context) {
    throw new Error("useSource must be used within a SourceProvider");
  }
  return context;
};
