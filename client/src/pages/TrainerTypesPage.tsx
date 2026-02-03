import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { PBSEntry, TrainerTypesFile, TrainerTypesMultiFile } from "@pbs/shared";
import { exportTrainerTypes, getBgmFiles, getTrainerTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";
import { useScrollTopButton } from "../hooks/useScrollTopButton";
import { formatKeyLabel, formatKeyLabelIfKnown } from "../utils/labelUtils";
import { useSettings } from "../settings";

const emptyFile: TrainerTypesFile = { entries: [] };
const emptyFiles: string[] = ["trainer_types.txt"];
const emptyBgm: string[] = [];

const GENDER_OPTIONS = ["Male", "Female", "Unknown"] as const;

export default function TrainerTypesPage() {
  const [data, setData] = useState<TrainerTypesFile>(emptyFile);
  const [bgmFiles, setBgmFiles] = useState<string[]>(emptyBgm);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<string[]>(emptyFiles);
  const [activeSource, setActiveSource] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [baselineEntries, setBaselineEntries] = useState<PBSEntry[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceDraft, setAddSourceDraft] = useState<string>("trainer_types.txt");
  const [manualSkillLevel, setManualSkillLevel] = useState<Set<string>>(new Set());
  const dirty = useDirty();
  const showTop = useScrollTopButton();
  const { openSettings, settings } = useSettings();
  const bgmOptions = useMemo(() => {
    const seen = new Set<string>();
    return bgmFiles.reduce<{ value: string; label: string }[]>((acc, file) => {
      const value = file.replace(/\.[^/.]+$/, "");
      if (seen.has(value)) return acc;
      seen.add(value);
      acc.push({ value, label: file });
      return acc;
    }, []);
  }, [bgmFiles]);

  const ensureTrainerTypeDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultTrainerTypeEntry(entry.id, entry.order, sourceFile);
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

  const normalizeTrainerTypesMulti = (payload: TrainerTypesMultiFile): TrainerTypesFile => {
    const files = payload.files?.length ? payload.files : ["trainer_types.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "trainer_types.txt";
      return ensureTrainerTypeDefaults(entry, source);
    });
    return { entries: normalized };
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getTrainerTypes(), getBgmFiles()])
      .then(([trainerResult, bgmResult]) => {
        if (!isMounted) return;
        const normalized = normalizeTrainerTypesMulti(trainerResult);
        setData(normalized);
        setBaselineEntries(normalized.entries);
        setBgmFiles(bgmResult);
        const files = trainerResult.files?.length ? trainerResult.files : ["trainer_types.txt"];
        setSourceFiles(files);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("trainer_types", false);
        const manual = new Set<string>();
        for (const entry of normalized.entries) {
          const baseMoney = getFieldValue(entry, "BaseMoney");
          const skillLevel = getFieldValue(entry, "SkillLevel");
          if (skillLevel && skillLevel !== baseMoney) manual.add(entry.id);
        }
        setManualSkillLevel(manual);
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
    dirty.setCurrentKey("trainer_types");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "trainer_types.txt") === activeSource);
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
    const updateSet = (set: Set<string>, setter: Dispatch<SetStateAction<Set<string>>>) => {
      if (!set.has(entry.id)) return;
      setter((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        next.add(nextId);
        return next;
      });
    };
    updateSet(manualSkillLevel, setManualSkillLevel);
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item;
        const nextFields = item.fields.map((field) => {
          if (field.key !== "Name") return field;
          if (field.value.trim().toLowerCase() !== entry.id.toLowerCase()) return field;
          return { ...field, value: toTitleCase(nextId) };
        });
        return { ...item, id: nextId, fields: nextFields };
      }),
    }));
    setActiveId(nextId);
  };

  const validateEntryFields = (entry: PBSEntry) => {
    const errors: Record<string, string> = {};
    const name = getFieldValue(entry, "Name").trim();
    if (!name) errors.Name = "Name is required.";

    const gender = getFieldValue(entry, "Gender").trim();
    if (!gender) {
      errors.Gender = "Gender is required.";
    } else if (!GENDER_OPTIONS.includes(gender as (typeof GENDER_OPTIONS)[number])) {
      errors.Gender = "Gender must be Male, Female, or Unknown.";
    }

    const baseMoney = getFieldValue(entry, "BaseMoney").trim();
    if (!baseMoney) {
      errors.BaseMoney = "BaseMoney is required.";
    } else if (!/^\d+$/.test(baseMoney)) {
      errors.BaseMoney = "BaseMoney must be an integer.";
    } else if (Number(baseMoney) < 1) {
      errors.BaseMoney = "BaseMoney must be at least 1.";
    }

    const skillLevel = getFieldValue(entry, "SkillLevel").trim();
    if (!skillLevel) {
      errors.SkillLevel = "SkillLevel is required.";
    } else if (!/^\d+$/.test(skillLevel)) {
      errors.SkillLevel = "SkillLevel must be an integer.";
    } else if (Number(skillLevel) < 1) {
      errors.SkillLevel = "SkillLevel must be at least 1.";
    }

    const flags = getFieldValue(entry, "Flags").trim();
    if (flags) {
      const parts = flags.split(",").map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (/\s/.test(part)) {
          errors.Flags = "Flags must not contain spaces.";
          break;
        }
      }
    }

    const bgmKeys = ["IntroBGM", "BattleBGM", "VictoryBGM"];
    for (const key of bgmKeys) {
      const value = getFieldValue(entry, key).trim();
      if (!value) continue;
      if (!bgmOptions.some((option) => option.value === value)) {
        errors[key] = `${key} must be a valid BGM file.`;
      }
    }

    return errors;
  };

  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, bgmOptions]);

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
  }, [deferredEntries, bgmOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, bgmOptions]);

  const isActiveEntryDirty = useMemo(() => {
    if (!activeEntry) return false;
    const source = activeEntry.sourceFile ?? "trainer_types.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "trainer_types.txt") === source
    );
    if (!baseline) return true;
    return serializeEntries([activeEntry]) !== serializeEntries([baseline]);
  }, [activeEntry, baselineEntries]);

  const handleResetEntry = () => {
    if (!activeEntry) return;
    const source = activeEntry.sourceFile ?? "trainer_types.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "trainer_types.txt") === source
    );
    if (!baseline) {
      setManualSkillLevel((prev) => {
        const next = new Set(prev);
        next.delete(activeEntry.id);
        return next;
      });
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
    const baseMoney = getFieldValue(cloned, "BaseMoney");
    const skillLevel = getFieldValue(cloned, "SkillLevel");
    setManualSkillLevel((prev) => {
      const next = new Set(prev);
      if (skillLevel && skillLevel !== baseMoney) {
        next.add(cloned.id);
      } else {
        next.delete(cloned.id);
      }
      return next;
    });
    setStatus(`Reset ${activeEntry.id}.`);
  };

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("trainer_types", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportTrainerTypes(data, settings);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      setBaselineEntries(data.entries);
      dirty.setDirty("trainer_types", false);
      const target = settings.exportMode === "PBS" ? "PBS/" : "PBS_Output/";

      setStatus(`Exported trainer type files to ${target}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["trainer_types.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWTRAINERTYPE");
    const newEntry: PBSEntry = buildDefaultTrainerTypeEntry(
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
      order: nextOrderForSource(entry.sourceFile ?? "trainer_types.txt"),
      sourceFile: entry.sourceFile,
      fields: entry.fields.map((field) => ({ ...field })),
    };
    if (manualSkillLevel.has(entry.id)) {
      setManualSkillLevel((prev) => new Set(prev).add(newId));
    }
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
    setManualSkillLevel((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
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
      .filter((entry) => (entry.sourceFile ?? "trainer_types.txt") === sourceFile)
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

  const buildDefaultTrainerTypeEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "Gender", value: "Unknown" },
      { key: "BaseMoney", value: "30" },
      { key: "SkillLevel", value: "30" },
      { key: "Flags", value: "" },
      { key: "IntroBGM", value: "" },
      { key: "BattleBGM", value: "" },
      { key: "VictoryBGM", value: "" },
    ],
  });

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  if (loading) {
    return <div className="panel">Loading trainer_types.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Trainer Types Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Trainer Types</h1>
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["trainer_types.txt"];
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
                {getFieldValue(entry, "Name") || "(no name)"}{" "}
                {activeSource === "ALL" && entry.sourceFile ? `• ${entry.sourceFile}` : ""}
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <TrainerTypeDetail
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
            bgmOptions={bgmOptions}
            manualSkillLevel={manualSkillLevel}
            setManualSkillLevel={setManualSkillLevel}
          />
        ) : (
          <div className="panel">Select a trainer type to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) =>
                      (entry.sourceFile ?? "trainer_types.txt") === (activeEntry.sourceFile ?? "trainer_types.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "trainer_types.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Trainer Type</h2>
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
                    handleAddEntry(addSourceDraft || "trainer_types.txt");
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
            Export trainer_types.txt
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
  bgmOptions: { value: string; label: string }[];
  manualSkillLevel: Set<string>;
  setManualSkillLevel: Dispatch<SetStateAction<Set<string>>>;
};

function TrainerTypeDetail({
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
  bgmOptions,
  manualSkillLevel,
  setManualSkillLevel,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [baseMoneyDraft, setBaseMoneyDraft] = useState("");
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setIdDraft(entry.id);
    setFieldDrafts({});
  }, [entry.id]);

  useEffect(() => {
    const currentBase = getFieldValue("BaseMoney");
    setBaseMoneyDraft(currentBase);
  }, [entry.id, entry.fields]);

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

  const commitBaseMoney = (index: number, nextValue: string) => {
    const currentSkill = getFieldValue("SkillLevel");
    const currentBase = getFieldValue("BaseMoney");
    const shouldSync = !manualSkillLevel.has(entry.id) && currentSkill === currentBase;
    const nextFields = entry.fields.map((field, idx) => {
      if (idx === index) return { key: field.key, value: nextValue };
      if (shouldSync && field.key === "SkillLevel") return { key: field.key, value: nextValue };
      return field;
    });
    onChange({ ...entry, fields: nextFields });
  };

  const addField = () => {
    onChange({
      ...entry,
      fields: [...entry.fields, { key: "NewKey", value: "" }],
    });
  };

  const getFieldValue = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";
  const setFieldValue = (key: string, value: string) => {
    const index = entry.fields.findIndex((field) => field.key === key);
    if (index === -1) return;
    updateField(index, key, value);
  };

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
          <button className="ghost" onClick={addField}>
            Add Field
          </button>
          <button className="danger" tabIndex={-1} onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="pokemon-sprite pokemon-sprite-left trainer-sprite">
        <img
          src={`/assets/graphics/Trainers/${entry.id}.png`}
          key={entry.id}
          alt=""
          onLoad={(event) => {
            event.currentTarget.style.visibility = "visible";
          }}
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Trainer Type ID</label>
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
          if (field.key === "Gender") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Gender")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "BaseMoney") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("BaseMoney")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={baseMoneyDraft}
                  onChange={(event) => {
                    setBaseMoneyDraft(event.target.value);
                  }}
                  onBlur={() => {
                    const nextValue = baseMoneyDraft;
                    commitBaseMoney(index, nextValue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const nextValue = baseMoneyDraft;
                      commitBaseMoney(index, nextValue);
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "SkillLevel") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("SkillLevel")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => {
                    const nextValue = getDraft(field.key, field.value);
                    commitDraft(index, field.key, nextValue);
                    const currentBase = getFieldValue("BaseMoney");
                    if (nextValue.trim() === "" || nextValue === currentBase) {
                      setManualSkillLevel((prev) => {
                        const next = new Set(prev);
                        next.delete(entry.id);
                        return next;
                      });
                    } else {
                      setManualSkillLevel((prev) => new Set(prev).add(entry.id));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Flags") {
            return (
              <FreeformListFieldEditor
                key={`${field.key}-${index}`}
                label="Flags"
                value={field.value}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "IntroBGM" || field.key === "BattleBGM" || field.key === "VictoryBGM") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  <option value="">(none)</option>
                  {bgmOptions.map((bgm) => (
                    <option key={bgm.label} value={bgm.value}>
                      {bgm.label}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
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

type FreeformListFieldEditorProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  error?: string;
};

const FreeformListFieldEditor = memo(function FreeformListFieldEditor({ label, value, onChange, error }: FreeformListFieldEditorProps) {
  const displayLabel = formatKeyLabel(label);
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const [draft, setDraft] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);
  useEffect(() => {
    setDrafts({});
  }, [value]);

  const handleChange = (index: number, next: string) => {
    const nextItems = [...items];
    if (!next) {
      nextItems.splice(index, 1);
    } else if (index === items.length) {
      nextItems.push(next);
    } else {
      nextItems[index] = next;
    }
    const deduped = nextItems.filter((item, idx) => nextItems.indexOf(item) === idx);
    onChange(deduped.join(","));
  };

  const commitAt = (index: number) => {
    const next = (drafts[index] ?? items[index] ?? "").trim();
    if (!next) {
      setDrafts((prev) => {
        if (!(index in prev)) return prev;
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }
    handleChange(index, next);
    setDrafts((prev) => {
      if (!(index in prev)) return prev;
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    handleChange(items.length, next);
    setDraft("");
  };

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{displayLabel}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)} tabIndex={-1}>
            {collapsed ? `Show (${items.length}) ▾` : "Hide ▴"}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="list-field-items">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="list-field-row">
            <input
              className="input"
              value={drafts[index] ?? item}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [index]: event.target.value }))
              }
              onBlur={() => commitAt(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitAt(index);
                }
              }}
            />
            <button className="danger" tabIndex={-1} onClick={() => handleChange(index, "")}>
              Remove
            </button>
          </div>
        ))}
        <div className="list-field-row">
          <input
            className="input"
            value={draft}
            placeholder={`Add ${displayLabel}...`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft();
              }
            }}
          />
        </div>
      </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

function getFieldValue(entry: PBSEntry, key: string) {
  return entry.fields.find((field) => field.key === key)?.value ?? "";
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "trainer_types.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "trainer_types.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}
