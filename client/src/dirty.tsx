import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PBSEntry } from "@pbs/shared";

type DirtyContextValue = {
  dirtyMap: Record<string, boolean>;
  currentKey: string | null;
  setDirty: (key: string, value: boolean) => void;
  setCurrentKey: (key: string) => void;
  anyDirty: boolean;
};

const DirtyContext = createContext<DirtyContextValue | null>(null);

export function DirtyProvider({ children }: { children: ReactNode }) {
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  const setDirty = (key: string, value: boolean) => {
    setDirtyMap((prev) => ({ ...prev, [key]: value }));
  };

  const anyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  const value: DirtyContextValue = {
    dirtyMap,
    currentKey,
    setDirty,
    setCurrentKey,
    anyDirty,
  };

  return <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>;
}

export function useDirty() {
  const ctx = useContext(DirtyContext);
  if (!ctx) throw new Error("useDirty must be used within DirtyProvider");
  return ctx;
}

export function serializeEntries(entries: PBSEntry[]) {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      order: entry.order,
      fields: entry.fields.map((field) => ({
        key: field.key,
        value: field.value,
      })),
    }))
  );
}
