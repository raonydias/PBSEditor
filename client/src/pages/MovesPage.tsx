import { useEffect, useMemo, useState } from "react";
import { MovesFile, MovesMultiFile, PBSEntry, TypesFile } from "@pbs/shared";
import { exportMoves, getMoves, getTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";
import { useScrollTopButton } from "../hooks/useScrollTopButton";
import { useSettings } from "../settings";

const emptyFile: MovesFile = { entries: [] };
const emptyFiles: string[] = ["moves.txt"];
const emptyTypes: TypesFile = { entries: [] };

const CATEGORY_OPTIONS = ["Physical", "Special", "Status"] as const;
const TARGET_OPTIONS = [
  "None",
  "User",
  "NearAlly",
  "UserOrNearAlly",
  "AllAllies",
  "UserAndAllies",
  "NearFoe",
  "RandomNearFoe",
  "AllNearFoes",
  "Foe",
  "AllFoes",
  "NearOther",
  "AllNearOthers",
  "Other",
  "AllBattlers",
  "UserSide",
  "FoeSide",
  "BothSides",
] as const;

const FLAG_OPTIONS = [
  "Contact",
  "CanProtect",
  "CanMirrorMove",
  "ThawsUser",
  "HighCriticalHitRate",
  "Biting",
  "Punching",
  "Sound",
  "Powder",
  "Pulse",
  "Bomb",
  "Dance",
  "CannotMetronome",
  "TramplesMinimize",
] as const;

export default function MovesPage() {
  const [data, setData] = useState<MovesFile>(emptyFile);
  const [types, setTypes] = useState<TypesFile>(emptyTypes);
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
  const [addSourceDraft, setAddSourceDraft] = useState<string>("moves.txt");
  const showTop = useScrollTopButton();
  const { openSettings } = useSettings();

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  const ensureMoveDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultMoveEntry(entry.id, entry.order, sourceFile);
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

  const normalizeMovesMulti = (payload: MovesMultiFile): MovesFile => {
    const files = payload.files?.length ? payload.files : ["moves.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "moves.txt";
      return ensureMoveDefaults(entry, source);
    });
    return { entries: normalized };
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getMoves(), getTypes()])
      .then(([movesResult, typesResult]) => {
        if (!isMounted) return;
        const normalized = normalizeMovesMulti(movesResult);
        setData(normalized);
        setBaselineEntries(normalized.entries);
        setTypes({ entries: typesResult.entries });
        const files = movesResult.files?.length ? movesResult.files : ["moves.txt"];
        setSourceFiles(files);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("moves", false);
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
    dirty.setCurrentKey("moves");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "moves.txt") === activeSource);
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

  const typeOptions = useMemo(() => ["NONE", ...types.entries.map((entry) => entry.id)], [types.entries]);

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
    const getField = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";

    const name = getField("Name").trim();
    if (!name) errors.Name = "Name is required.";

    const type = getField("Type").trim();
    if (!type) {
      errors.Type = "Type is required.";
    } else if (type !== "NONE" && !typeOptions.includes(type)) {
      errors.Type = "Type must be a valid Type ID or NONE.";
    }

    const category = getField("Category").trim();
    if (!category) {
      errors.Category = "Category is required.";
    } else if (!CATEGORY_OPTIONS.includes(category as (typeof CATEGORY_OPTIONS)[number])) {
      errors.Category = "Category must be Physical, Special, or Status.";
    }

    const power = getField("Power").trim();
    if (category !== "Status") {
      if (!power) {
        errors.Power = "Power is required.";
      } else if (!/^\d+$/.test(power)) {
        errors.Power = "Power must be an integer.";
      } else if (Number(power) < 0) {
        errors.Power = "Power must be 0 or greater.";
      }
    } else if (power && !/^\d+$/.test(power)) {
      errors.Power = "Power must be an integer.";
    }

    const accuracy = getField("Accuracy").trim();
    if (!accuracy) {
      errors.Accuracy = "Accuracy is required.";
    } else if (!/^\d+$/.test(accuracy)) {
      errors.Accuracy = "Accuracy must be an integer.";
    } else if (Number(accuracy) < 0 || Number(accuracy) > 100) {
      errors.Accuracy = "Accuracy must be between 0 and 100.";
    }

    const totalPP = getField("TotalPP").trim();
    if (!totalPP) {
      errors.TotalPP = "TotalPP is required.";
    } else if (!/^\d+$/.test(totalPP)) {
      errors.TotalPP = "TotalPP must be an integer.";
    } else if (Number(totalPP) < 1) {
      errors.TotalPP = "TotalPP must be at least 1.";
    }

    const target = getField("Target").trim();
    if (target && /\s/.test(target)) {
      errors.Target = "Target must not contain spaces.";
    }

    const priority = getField("Priority").trim();
    if (priority) {
      if (!/^-?\d+$/.test(priority)) {
        errors.Priority = "Priority must be an integer.";
      }
    }

    const functionCode = getField("FunctionCode").trim();
    if (!functionCode) {
      errors.FunctionCode = "FunctionCode is required.";
    } else if (/\s/.test(functionCode)) {
      errors.FunctionCode = "FunctionCode must not contain spaces.";
    }

    const effectChance = getField("EffectChance").trim();
    if (effectChance) {
      if (!/^\d+$/.test(effectChance)) {
        errors.EffectChance = "EffectChance must be an integer.";
      } else if (Number(effectChance) < 0 || Number(effectChance) > 100) {
        errors.EffectChance = "EffectChance must be between 0 and 100.";
      }
    }

    const flags = getField("Flags").trim();
    if (flags) {
      const parts = flags.split(",").map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (/\s/.test(part)) {
          errors.Flags = "Flags must not contain spaces.";
          break;
        }
      }
    }

    const description = getField("Description").trim();
    if (!description) errors.Description = "Description is required.";

    return errors;
  };

  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, typeOptions]);

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

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [data.entries, typeOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, typeOptions]);

  const isActiveEntryDirty = useMemo(() => {
    if (!activeEntry) return false;
    const source = activeEntry.sourceFile ?? "moves.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "moves.txt") === source
    );
    if (!baseline) return true;
    return serializeEntries([activeEntry]) !== serializeEntries([baseline]);
  }, [activeEntry, baselineEntries]);

  const handleResetEntry = () => {
    if (!activeEntry) return;
    const source = activeEntry.sourceFile ?? "moves.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "moves.txt") === source
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
    dirty.setDirty("moves", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportMoves(data);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      setBaselineEntries(data.entries);
      dirty.setDirty("moves", false);
      setStatus("Exported move files to PBS_Output/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["moves.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWMOVE");
    const newEntry: PBSEntry = buildDefaultMoveEntry(
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
      order: nextOrderForSource(entry.sourceFile ?? "moves.txt"),
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
      .filter((entry) => (entry.sourceFile ?? "moves.txt") === sourceFile)
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

  const buildDefaultMoveEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "Type", value: "NONE" },
      { key: "Category", value: "Status" },
      { key: "Power", value: "0" },
      { key: "Accuracy", value: "100" },
      { key: "TotalPP", value: "5" },
      { key: "Target", value: "" },
      { key: "Priority", value: "0" },
      { key: "FunctionCode", value: "None" },
      { key: "Flags", value: "" },
      { key: "EffectChance", value: "" },
      { key: "Description", value: "???" },
    ],
  });

  if (loading) {
    return <div className="panel">Loading moves.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Moves Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Moves</h1>
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["moves.txt"];
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
                {entry.fields.find((f) => f.key === "Name")?.value ?? "(no name)"}{" "}
                {activeSource === "ALL" && entry.sourceFile ? `• ${entry.sourceFile}` : ""}
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <MoveDetail
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
            typeOptions={typeOptions}
          />
        ) : (
          <div className="panel">Select a move to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) => (entry.sourceFile ?? "moves.txt") === (activeEntry.sourceFile ?? "moves.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "moves.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Move</h2>
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
                    handleAddEntry(addSourceDraft || "moves.txt");
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
                  <div className="muted">{errors.join(" • ")}</div>
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
            Export moves.txt
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
  typeOptions: string[];
};

function MoveDetail({
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
  typeOptions,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [isCustomTarget, setIsCustomTarget] = useState(false);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

  useEffect(() => {
    const currentTarget = entry.fields.find((field) => field.key === "Target")?.value ?? "";
    const isCustom =
      currentTarget !== "" &&
      !TARGET_OPTIONS.includes(currentTarget as (typeof TARGET_OPTIONS)[number]);
    setIsCustomTarget(isCustom);
  }, [entry.id, entry.fields]);

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value } : field
    );
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

  const category = getFieldValue("Category");
  const power = getFieldValue("Power");
  const showPowerWarning = category === "Status" && power.trim() !== "" && power !== "0";

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
          <button className="danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Move ID</label>
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
          if (field.key === "Type") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Type" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Category") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Category" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Target") {
            const currentTarget = field.value;
            const selectValue = currentTarget === "" ? "" : isCustomTarget ? "__custom__" : currentTarget;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Target" readOnly />
                <div className="stack">
                  <select
                    className="input"
                    value={selectValue}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next === "__custom__") {
                        setIsCustomTarget(true);
                      } else {
                        setIsCustomTarget(false);
                        updateField(index, field.key, next);
                      }
                    }}
                  >
                    <option value="">Select target...</option>
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </select>
                  {isCustomTarget && (
                    <input
                      className="input"
                      placeholder="Custom target"
                      value={currentTarget}
                      onChange={(event) => updateField(index, field.key, event.target.value)}
                    />
                  )}
                </div>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Flags") {
            return (
              <ListFieldEditor
                key={`${field.key}-${index}`}
                label="Flags"
                value={field.value}
                options={FLAG_OPTIONS}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "Power") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Power" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {showPowerWarning && (
                  <span className="field-warning">Status moves ignore Power; it will be omitted on export.</span>
                )}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input className="input" value={field.key} readOnly />
              <input
                className="input"
                value={field.value}
                onChange={(event) => updateField(index, field.key, event.target.value)}
              />
              {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ListFieldEditorProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (nextValue: string) => void;
  error?: string;
};

function ListFieldEditor({ label, value, options, onChange, error }: ListFieldEditorProps) {
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const [draft, setDraft] = useState("");
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

  const handleSelectChange = (index: number, next: string) => {
    const normalized = normalizeOption(next, options);
    const nextItems = [...items];
    if (normalized === "") {
      nextItems.splice(index, 1);
    } else if (index === items.length) {
      nextItems.push(normalized);
    } else {
      nextItems[index] = normalized;
    }
    const deduped = nextItems.filter((item, idx) => nextItems.indexOf(item) === idx);
    onChange(deduped.join(","));
  };

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    handleSelectChange(items.length, next);
    setDraft("");
  };

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{label}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)}>
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
              list={`${label}-options`}
              value={item}
              onChange={(event) => handleSelectChange(index, event.target.value)}
            />
            <datalist id={`${label}-options`}>
              {options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <button className="ghost" onClick={() => handleSelectChange(index, "")}>Remove</button>
          </div>
        ))}
        <div className="list-field-row">
          <input
            className="input"
            list={`${label}-options`}
            value={draft}
            placeholder="Add flag..."
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft();
              }
            }}
          />
          <datalist id={`${label}-options`}>
            {options
              .filter((option) => !items.includes(option))
              .map((option) => (
                <option key={option} value={option} />
              ))}
          </datalist>
        </div>
      </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "moves.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "moves.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}

function normalizeOption(value: string, options: readonly string[]) {
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());
  return match ?? value;
}
