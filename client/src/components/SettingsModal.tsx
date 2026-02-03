import { useSettings } from "../settings";

const THEME_OPTIONS = [
  { value: "umbreon", label: "Umbreon (default)" },
  { value: "daylight", label: "Daylight" },
  { value: "pokeball", label: "Poké Ball" },
];

export default function SettingsModal() {
  const { settings, setSettings, showSettings, closeSettings } = useSettings();

  if (!showSettings) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal settings-modal">
        <div className="panel-header">
          <h2>Settings</h2>
          <button className="ghost" onClick={closeSettings}>
            Close
          </button>
        </div>
        <div className="field-list">
          <div className="field-row">
            <div className="settings-label">Theme</div>
            <select
              className="input"
              value={settings.theme}
              onChange={(event) =>
                setSettings({ ...settings, theme: event.target.value })
              }
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row single">
            <div className="toggle-row">
              <div>
                <div className="toggle-title">Images</div>
                <div className="muted">Show sprites and icons in all editors.</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.images}
                  onChange={(event) =>
                    setSettings({ ...settings, images: event.target.checked })
                  }
                />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          <div className="field-row single">
            <div className="toggle-row">
              <div>
                <div className="toggle-title">Animation</div>
                <div className="muted">Enable bouncing icon animation.</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(event) =>
                    setSettings({ ...settings, animations: event.target.checked })
                  }
                />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          <div className="field-row">
            <div className="settings-label">Export Mode</div>
            <select
              className="input"
              value={settings.exportMode}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  exportMode: event.target.value as "PBS_Output" | "PBS",
                })
              }
            >
              <option value="PBS_Output">PBS_Output</option>
              <option value="PBS">PBS</option>
            </select>
          </div>
          <div className="field-row single">
            <div className="muted">
              {settings.exportMode === "PBS_Output"
                ? "Exports are written to PBS_Output. You manually copy files into PBS/ when ready."
                : "Exports are written directly into PBS/. We recommend backing up your original files."}
            </div>
          </div>

          {settings.exportMode === "PBS" && (
            <div className="field-row single">
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Create backup in PBS_Backup/</div>
                  <div className="muted">
                    Save timestamped backups before overwriting PBS files.
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.createBackup}
                    onChange={(event) =>
                      setSettings({ ...settings, createBackup: event.target.checked })
                    }
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
          )}

          {settings.exportMode === "PBS" && settings.createBackup && (
            <>
              <div className="field-row">
                <div className="settings-label">Backup limit</div>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={settings.backupLimit}
                  onChange={(event) => {
                    const next = Math.max(0, Number(event.target.value || 0));
                    setSettings({ ...settings, backupLimit: Number.isFinite(next) ? Math.floor(next) : 0 });
                  }}
                />
              </div>
              <div className="field-row single">
                <div className="muted">
                  0 means unlimited backups. Limits are tracked per PBS file (e.g. 5 backups for pokemon.txt).
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
