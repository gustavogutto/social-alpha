import React, { createContext, useContext, useState } from 'react';

type DemoContextValue = {
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoMode] = useState(false);
  return <DemoContext.Provider value={{ demoMode, setDemoMode }}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
