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
  const [sourceType, setSourceTypeState] = useState<SourceType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexa_source_type");
      if (saved === "website" || saved === "home_network") return saved;
    }
    return "website";
  });
  const [sites, setSites] = useState<RegisteredSiteItem[]>([]);
  const [activeSite, setActiveSiteState] = useState<RegisteredSiteItem | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nexa_active_site");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSourceType = (type: SourceType) => {
    setSourceTypeState(type);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexa_source_type", type);
    }
  };

  const setActiveSite = (site: RegisteredSiteItem | null) => {
    setActiveSiteState(site);
    if (typeof window !== "undefined") {
      if (site) {
        localStorage.setItem("nexa_active_site", JSON.stringify(site));
      } else {
        localStorage.removeItem("nexa_active_site");
      }
    }
  };

  const refreshSites = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sites/`);
      if (res.ok) {
        const data = await res.json();
        const list: RegisteredSiteItem[] = Array.isArray(data) ? data : (data.results || []);
        setSites(list);

        const active = list.find((s) => s.is_active) || list[0] || null;
        setActiveSiteState((prev) => {
          const target = (prev && list.find((s) => s.id === prev.id)) || active;
          if (typeof window !== "undefined" && target) {
            localStorage.setItem("nexa_active_site", JSON.stringify(target));
          }
          return target;
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
