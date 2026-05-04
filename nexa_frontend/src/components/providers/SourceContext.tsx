"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type SourceType = "website" | "home_network";

interface SourceContextType {
  sourceType: SourceType;
  setSourceType: (type: SourceType) => void;
}

const SourceContext = createContext<SourceContextType | undefined>(undefined);

export const SourceProvider = ({ children }: { children: ReactNode }) => {
  const [sourceType, setSourceType] = useState<SourceType>("website");

  return (
    <SourceContext.Provider value={{ sourceType, setSourceType }}>
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
