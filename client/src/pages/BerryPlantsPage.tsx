import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { BerryPlantsFile, BerryPlantsMultiFile, PBSEntry } from "@pbs/shared";
import { exportBerryPlants, getBerryPlants } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";
import { useScrollTopButton } from "../hooks/useScrollTopButton";
import { formatKeyLabel, formatKeyLabelIfKnown } from "../utils/labelUtils";
import { useSettings } from "../settings";

const emptyFile: BerryPlantsFile = { entries: [] };
const emptyFiles: string[] = ["berry_plants.txt"];

export default function BerryPlantsPage() {
  const [data, setData] = useState<BerryPlantsFile>(emptyFile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<string[]>(emptyFiles);
  const [activeSource, setActiveSource] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const dirty = useDirty();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [baselineEntries, setBaselineEntries] = useState<PBSEntry[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceDraft, setAddSourceDraft] = useState<string>("berry_plants.txt");
  const showTop = useScrollTopButton();
  const { openSettings, settings } = useSettings();

  const ensureBerryPlantDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultBerryPlantEntry(entry.id, entry.order, sourceFile);
    const existing = new Map(entry.fields.map((field) => [field.key, field.value]));
    const defaultKeys = new Set(defaults.fields.map((field) => field.key));
    const merged = defaults.fields.map((field) => ({
      key: field.key,
      value: existing.get(field.key) ?? field.value,
    }));
    for (const field of entry.fields) {
      if (!defaultKeys.has(field.key)) merged.push(field);
    }
    return { ...entry, fields: merged, sourceFile: entry.sourceFile ?? sourceFile };
  };

  const normalizeBerryPlantsMulti = (payload: BerryPlantsMultiFile): BerryPlantsFile => {
    const files = payload.files?.length ? payload.files : ["berry_plants.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "berry_plants.txt";
      return ensureBerryPlantDefaults(entry, source);
    });
    return { entries: normalized };
  };

  useEffect(() => {
    let isMounted = true;
    getBerryPlants()
      .then((result) => {
        if (!isMounted) return;
        const normalized = normalizeBerryPlantsMulti(result);
        setData(normalized);
        setBaselineEntries(normalized.entries);
        const files = result.files?.length ? result.files : ["berry_plants.txt"];
        setSourceFiles(files);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("berry_plants", false);
        setActiveSource(files.length === 1 ? files[0] : "ALL");
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    dirty.setCurrentKey("berry_plants");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "berry_plants.txt") === activeSource);
    if (!needle) return sourceFiltered;
    return sourceFiltered.filter((entry) => entry.id.includes(needle));
  }, [data.entries, filter, activeSource]);

  useEffect(() => {
    if (!activeId) return;
    if (filteredEntries.some((entry) => entry.id === activeId)) return;
    setActiveId(filteredEntries[0]?.id ?? null);
  }, [filteredEntries, activeId]);

  useEffect(() => {
    setIdError(null);
  }, [activeId]);

  const updateEntry = (updated: PBSEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    }));
  };

  const validateEntryId = (entry: PBSEntry, nextIdRaw: string) => {
    const nextId = nextIdRaw.trim().toUpperCase();
    if (!nextId) return "ID is required.";
    if (!/^[A-Z0-9_]+$/.test(nextId)) return "ID must use A-Z, 0-9, or _ only.";
    if (data.entries.some((item) => item.id.toLowerCase() === nextId.toLowerCase() && item.id !== entry.id)) {
      return "ID must be unique.";
    }
    return null;
  };

  const updateEntryId = (entry: PBSEntry, nextIdRaw: string) => {
    const nextId = nextIdRaw.trim().toUpperCase();
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item;
        return { ...item, id: nextId };
      }),
    }));
    setActiveId(nextId);
  };

  const validateEntryFields = (entry: PBSEntry) => {
    const errors: Record<string, string> = {};
    const getField = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";

    const hours = getField("HoursPerStage").trim();
    if (!hours) {
      errors.HoursPerStage = "HoursPerStage is required.";
    } else if (!/^\d+$/.test(hours)) {
      errors.HoursPerStage = "HoursPerStage must be an integer.";
    } else if (Number(hours) < 1) {
      errors.HoursPerStage = "HoursPerStage must be at least 1.";
    }

    const drying = getField("DryingPerHour").trim();
    if (!drying) {
      errors.DryingPerHour = "DryingPerHour is required.";
    } else if (!/^\d+$/.test(drying)) {
      errors.DryingPerHour = "DryingPerHour must be an integer.";
    } else if (Number(drying) < 1) {
      errors.DryingPerHour = "DryingPerHour must be at least 1.";
    }

    const yieldValue = getField("Yield").trim();
    if (!yieldValue) {
      errors.Yield = "Yield is required.";
    } else {
      const parts = yieldValue.split(",").map((part) => part.trim());
      if (parts.length !== 2 || parts.some((part) => part === "")) {
        errors.Yield = "Yield must be two integers separated by a comma.";
      } else if (parts.some((part) => !/^-?\d+$/.test(part))) {
        errors.Yield = "Yield must be two integers.";
      } else {
        const min = Number(parts[0]);
        const max = Number(parts[1]);
        if (min < 1) errors.Yield = "MinYield must be at least 1.";
        else if (max <= min) errors.Yield = "MaxYield must be greater than MinYield.";
      }
    }

    return errors;
  };

  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry]);

  const collectEntryErrors = (entry: PBSEntry) => {
    const errors: string[] = [];
    const idErrorMessage = validateEntryId(entry, entry.id);
    if (idErrorMessage) errors.push(`ID: ${idErrorMessage}`);
    const fieldErrorMap = validateEntryFields(entry);
    for (const [key, message] of Object.entries(fieldErrorMap)) {
      errors.push(`${key}: ${message}`);
    }
    return errors;
  };

  const deferredEntries = useDeferredValue(data.entries);
  const invalidEntries = useMemo(() => {
    return deferredEntries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [deferredEntries]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries]);

  const isActiveEntryDirty = useMemo(() => {
    if (!activeEntry) return false;
    const source = activeEntry.sourceFile ?? "berry_plants.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "berry_plants.txt") === source
    );
    if (!baseline) return true;
    return serializeEntries([activeEntry]) !== serializeEntries([baseline]);
  }, [activeEntry, baselineEntries]);

  const handleResetEntry = () => {
    if (!activeEntry) return;
    const source = activeEntry.sourceFile ?? "berry_plants.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "berry_plants.txt") === source
    );
    if (!baseline) {
      setData((prev) => {
        const nextEntries = prev.entries.filter((entry) => entry.id !== activeEntry.id);
        const nextActive =
          nextEntries.find((entry) => entry.order > activeEntry.order)?.id ?? nextEntries[0]?.id ?? null;
        setActiveId(nextActive);
        return { ...prev, entries: nextEntries };
      });
      setStatus(`Reset removed ${activeEntry.id}.`);
      return;
    }
    const cloned = JSON.parse(JSON.stringify(baseline)) as PBSEntry;
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === activeEntry.id ? cloned : entry)),
    }));
    setStatus(`Reset ${activeEntry.id}.`);
  };

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("berry_plants", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportBerryPlants(data, settings);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      setBaselineEntries(data.entries);
      dirty.setDirty("berry_plants", false);
      const target = settings.exportMode === "PBS" ? "PBS/" : "PBS_Output/";

      setStatus(`Exported berry plant files to ${target}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["berry_plants.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWBERRYPLANT");
    const newEntry: PBSEntry = buildDefaultBerryPlantEntry(
      newId,
      nextOrderForSource(resolvedTarget),
      resolvedTarget
    );
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));
    setActiveId(newId);
    setStatus(`Added ${newId}. Remember to export when ready.`);
  };

  const handleDuplicateEntry = (entry: PBSEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const baseId = entry.id.endsWith("COPY") ? entry.id : `${entry.id}COPY`;
    const newId = nextCopyId(baseId);
    const duplicated: PBSEntry = {
      ...entry,
      id: newId,
      order: nextOrderForSource(entry.sourceFile ?? "berry_plants.txt"),
      sourceFile: entry.sourceFile,
      fields: entry.fields.map((field) => ({ ...field })),
    };
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, duplicated],
    }));
    setActiveId(newId);
    setStatus(`Duplicated ${entry.id} as ${newId}.`);
  };

  const handleDeleteEntry = (entry: PBSEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const confirmDelete = window.confirm(`Delete ${entry.id}? This cannot be undone.`);
    if (!confirmDelete) return;
    setData((prev) => {
      const nextEntries = prev.entries.filter((item) => item.id !== entry.id);
      const nextActive =
        nextEntries.find((item) => item.order > entry.order)?.id ??
        nextEntries[nextEntries.length - 1]?.id ??
        null;
      setActiveId(nextActive);
      return { ...prev, entries: nextEntries };
    });
    setStatus(`Deleted ${entry.id}.`);
  };

  const nextOrderForSource = (sourceFile: string) => {
    const orders = data.entries
      .filter((entry) => (entry.sourceFile ?? "berry_plants.txt") === sourceFile)
      .map((entry) => entry.order + 1);
    return Math.max(0, ...orders);
  };

  const nextAvailableId = (base: string) => {
    const existing = new Set(data.entries.map((entry) => entry.id.toLowerCase()));
    if (!existing.has(base.toLowerCase())) return base;
    let counter = 2;
    while (existing.has(`${base}${counter}`.toLowerCase())) counter += 1;
    return `${base}${counter}`;
  };

  const nextCopyId = (baseId: string) => {
    const existing = new Set(data.entries.map((entry) => entry.id.toLowerCase()));
    if (!existing.has(baseId.toLowerCase())) return baseId;
    let index = 0;
    while (true) {
      const suffix = indexToLetters(index);
      const candidate = `${baseId}${suffix}`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      index += 1;
    }
  };

  const indexToLetters = (index: number) => {
    let n = index + 1;
    let result = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  };

  const buildDefaultBerryPlantEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
    fields: [
      { key: "HoursPerStage", value: "3" },
      { key: "DryingPerHour", value: "15" },
      { key: "Yield", value: "2,5" },
    ],
  });

  if (loading) {
    return <div className="panel">Loading berry_plants.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Berry Plants Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Berry Plants</h1>
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["berry_plants.txt"];
              if (activeSource === "ALL" && availableFiles.length > 1) {
                setAddSourceDraft(availableFiles[0]);
                setShowAddSourceModal(true);
                return;
              }
              handleAddEntry();
            }}
          >
            Add New
          </button>
        </div>
        <div className="list-filter">
          <select
            className="input"
            value={activeSource}
            onChange={(event) => setActiveSource(event.target.value)}
          >
            <option value="ALL">All files</option>
            {sourceFiles.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        </div>
        <div className="list-filter">
          <input
            className="input"
            placeholder="Filter by ID..."
            value={filter}
            onChange={(event) => setFilter(event.target.value.toUpperCase())}
          />
        </div>
        <div className="list">
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              className={`list-item ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-title">{entry.id}</div>
              <div className="list-sub">
                {entry.fields.find((f) => f.key === "HoursPerStage")?.value ?? "?"}h/stage{" "}
                {activeSource === "ALL" && entry.sourceFile ? `• ${entry.sourceFile}` : ""}
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <BerryPlantDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            onMoveEntry={() => setShowMoveModal(true)}
            canMoveEntry={activeSource !== "ALL"}
            idError={idError}
            onSetIdError={setIdError}
            fieldErrors={fieldErrors}
          />
        ) : (
          <div className="panel">Select a berry plant to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) =>
                      (entry.sourceFile ?? "berry_plants.txt") === (activeEntry.sourceFile ?? "berry_plants.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "berry_plants.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Berry Plant</h2>
              <p>Select which file this entry should be added to.</p>
              <div className="field-list">
                <div className="field-row single">
                  <label className="label">Target file</label>
                  <select
                    className="input"
                    value={addSourceDraft}
                    onChange={(event) => setAddSourceDraft(event.target.value)}
                  >
                    {sourceFiles.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button className="ghost" onClick={() => setShowAddSourceModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    handleAddEntry(addSourceDraft || "berry_plants.txt");
                    setShowAddSourceModal(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
        {invalidEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Validation Issues</h2>
              <div className="muted">Fix these before exporting.</div>
            </div>
            <div className="field-list">
              {invalidEntries.map(({ entry, errors }) => (
                <div key={entry.id} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id}</strong>
                    <button className="ghost" onClick={() => setActiveId(entry.id)}>
                      Go to entry
                    </button>
                  </div>
                  <div className="muted">
                    {errors.map((message, index) => (
                      <div key={`${entry.id}-${index}`}>{message}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
      <section className="export-bar">
        <div className="export-settings">
          <button className="ghost settings" title="Settings" onClick={openSettings}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
            </svg>
          </button>
          <span className="export-mode">
            {settings.exportMode === "PBS"
              ? `PBS${settings.createBackup ? ` (backup${settings.backupLimit > 0 ? `: ${settings.backupLimit}` : ""})` : ""}`
              : "PBS_Output"}
          </span>
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          {showTop && (
            <button
              className="ghost top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Back to top"
            ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
            </svg></button>
          )}
          <button className="ghost reset" onClick={handleResetEntry} disabled={!isActiveEntryDirty}>
            Reset
          </button>
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export berry_plants.txt
          </button>
        </div>
      </section>
    </div>
  );
}

type DetailProps = {
  entry: PBSEntry;
  onChange: (entry: PBSEntry) => void;
  onRename: (entry: PBSEntry, nextId: string) => void;
  onValidateId: (entry: PBSEntry, nextId: string) => string | null;
  onDuplicate: (entry: PBSEntry) => void;
  onDelete: (entry: PBSEntry) => void;
  onMoveEntry: () => void;
  canMoveEntry: boolean;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  fieldErrors: Record<string, string>;
};

function BerryPlantDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onDuplicate,
  onDelete,
  onMoveEntry,
  canMoveEntry,
  idError,
  onSetIdError,
  fieldErrors,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setIdDraft(entry.id);
    setFieldDrafts({});
  }, [entry.id]);

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const getDraft = (key: string, fallback: string) => fieldDrafts[key] ?? fallback;
  const setDraft = (key: string, value: string) => {
    setFieldDrafts((prev) => ({ ...prev, [key]: value }));
  };
  const clearDraft = (key: string) => {
    setFieldDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const commitDraft = (index: number, key: string, value: string) => {
    updateField(index, key, value);
    clearDraft(key);
  };

  const getFieldValue = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";
  const setFieldValue = (key: string, value: string) => {
    const index = entry.fields.findIndex((field) => field.key === key);
    if (index === -1) return;
    updateField(index, key, value);
  };

  const yieldValue = getFieldValue("Yield");
  const [yieldMin, yieldMax] = yieldValue.split(",").map((part) => part.trim());

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.id}</h2>
        <div className="button-row">
          <button
            className={`ghost${canMoveEntry ? "" : " disabled"}`}
            onClick={onMoveEntry}
            disabled={!canMoveEntry}
            title={!canMoveEntry ? "Can't move while viewing all files." : ""}
          >
            Move Entry
          </button>
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Duplicate
          </button>
          <button className="danger" tabIndex={-1} onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="pokemon-sprite pokemon-sprite-left">
        <div className="berry-sprite">
          <img
            src={`/assets/graphics/Characters/berrytree_${entry.id}.png`}
            key={entry.id}
            alt=""
            width={128}
            height={256}
            onLoad={(event) => {
              event.currentTarget.style.visibility = "visible";
            }}
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Berry Plant ID</label>
          <input
            className="input"
            value={idDraft}
            onChange={(event) => {
              const nextDraft = event.target.value.toUpperCase();
              setIdDraft(nextDraft);
              const errorMessage = onValidateId(entry, nextDraft);
              onSetIdError(errorMessage);
              if (!errorMessage && nextDraft !== entry.id) {
                onRename(entry, nextDraft);
              }
            }}
          />
          {idError && <span className="field-error">{idError}</span>}
        </div>
      </div>
      <div className="field-list">
        {entry.fields.map((field, index) => {
          if (field.key === "Yield") {
            return (
                <div key={`${field.key}-${index}`} className="yield-grid">
                  <div className="field-row">
                    <input className="input key-label" value={formatKeyLabel("MinYield")} readOnly tabIndex={-1} />
                    <input
                      className="input"
                      value={getDraft("yield-min", yieldMin ?? "")}
                      onChange={(event) => setDraft("yield-min", event.target.value)}
                      onBlur={() => {
                        const nextMin = getDraft("yield-min", yieldMin ?? "");
                        const nextMax = getDraft("yield-max", yieldMax ?? "");
                        setFieldValue("Yield", `${nextMin},${nextMax}`);
                        clearDraft("yield-min");
                        clearDraft("yield-max");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  <div className="field-row">
                    <input className="input key-label" value={formatKeyLabel("MaxYield")} readOnly tabIndex={-1} />
                    <input
                      className="input"
                      value={getDraft("yield-max", yieldMax ?? "")}
                      onChange={(event) => setDraft("yield-max", event.target.value)}
                      onBlur={() => {
                        const nextMin = getDraft("yield-min", yieldMin ?? "");
                        const nextMax = getDraft("yield-max", yieldMax ?? "");
                        setFieldValue("Yield", `${nextMin},${nextMax}`);
                        clearDraft("yield-min");
                        clearDraft("yield-max");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                  {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
                </div>
              );
            }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input
                className="input key-label"
                value={
                  field.key === "HoursPerStage"
                    ? "Hours per Stage"
                    : field.key === "DryingPerHour"
                    ? "Drying per Hour"
                    : formatKeyLabelIfKnown(field.key)
                }
                readOnly tabIndex={-1}
              />
              <input
                className="input"
                value={getDraft(field.key, field.value)}
                onChange={(event) => setDraft(field.key, event.target.value)}
                onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
              {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "berry_plants.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "berry_plants.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}
