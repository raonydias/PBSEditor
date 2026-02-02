import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ExportMode = "PBS_Output" | "PBS";

export type AppSettings = {
  theme: string;
  images: boolean;
  animations: boolean;
  exportMode: ExportMode;
  createBackup: boolean;
};

type SettingsContextValue = {
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const STORAGE_KEY = "pbs-editor-settings";
const DEFAULT_SETTINGS: AppSettings = {
  theme: "nocturne",
  images: true,
  animations: true,
  exportMode: "PBS_Output",
  createBackup: true,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const readSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
      images: parsed.images ?? DEFAULT_SETTINGS.images,
      animations: parsed.animations ?? DEFAULT_SETTINGS.animations,
      exportMode: parsed.exportMode ?? DEFAULT_SETTINGS.exportMode,
      createBackup: parsed.createBackup ?? DEFAULT_SETTINGS.createBackup,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.body.dataset.theme = settings.theme;
    document.body.classList.toggle("hide-images", !settings.images);
    document.body.classList.toggle("disable-animations", !settings.animations);
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      showSettings,
      openSettings: () => setShowSettings(true),
      closeSettings: () => setShowSettings(false),
    }),
    [settings, showSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
