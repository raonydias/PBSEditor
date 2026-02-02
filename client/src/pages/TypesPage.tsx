import { useEffect, useMemo, useState } from "react";
import { PBSEntry, TypesFile, TypesMultiFile } from "@pbs/shared";
import { exportTypes, getTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";

const emptyFile: TypesFile = { entries: [] };
const emptyFiles: string[] = ["types.txt"];

export default function TypesPage() {
  const [data, setData] = useState<TypesFile>(emptyFile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const dirty = useDirty();
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [typesSpriteHeight, setTypesSpriteHeight] = useState<number | null>(null);
  const [sourceFiles, setSourceFiles] = useState<string[]>(emptyFiles);
  const [activeSource, setActiveSource] = useState<string>("ALL");
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceDraft, setAddSourceDraft] = useState<string>("types.txt");

  const ensureTypeDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultTypeEntry(entry.id, entry.order, sourceFile);
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

  const normalizeTypesMulti = (payload: TypesMultiFile): TypesFile => {
    const files = payload.files?.length ? payload.files : ["types.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "types.txt";
      return ensureTypeDefaults(entry, source);
    });
    return { entries: normalized };
  };

  useEffect(() => {
    let isMounted = true;
    getTypes()
      .then((result) => {
        if (!isMounted) return;
        const normalized = normalizeTypesMulti(result);
        setData(normalized);
        setActiveId(normalized.entries[0]?.id ?? null);
        setSourceFiles(result.files?.length ? result.files : ["types.txt"]);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("types", false);
        setActiveSource("ALL");
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
    dirty.setCurrentKey("types");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setTypesSpriteHeight(img.height);
    };
    img.onerror = () => {
      if (!cancelled) setTypesSpriteHeight(null);
    };
    img.src = "/assets/graphics/UI/types.png";
    return () => {
      cancelled = true;
    };
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "types.txt") === activeSource);
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
    const typeIds = new Set(data.entries.map((item) => item.id));

    const name = getField("Name").trim();
    if (!name) errors.Name = "Name is required.";

    const iconPosition = getField("IconPosition").trim();
    if (!iconPosition) {
      errors.IconPosition = "IconPosition is required.";
    } else if (!/^\d+$/.test(iconPosition)) {
      errors.IconPosition = "IconPosition must be an integer.";
    } else if (Number(iconPosition) < 0) {
      errors.IconPosition = "IconPosition must be 0 or greater.";
    }

    const optionalBoolKeys = ["IsSpecialType", "IsPseudoType"];
    for (const key of optionalBoolKeys) {
      const value = getField(key).trim().toLowerCase();
      if (value && value !== "true" && value !== "false") {
        errors[key] = `${key} must be true or false.`;
      }
    }

    const listKeys = ["Weaknesses", "Resistances", "Immunities"];
    for (const key of listKeys) {
      const raw = getField(key).trim();
      if (!raw) continue;
      const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (!/^[A-Z0-9_]+$/.test(part)) {
          errors[key] = `${key} must contain valid Type IDs.`;
          break;
        }
        if (!typeIds.has(part)) {
          errors[key] = `Unknown Type ID: ${part}`;
          break;
        }
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

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [data.entries]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("types", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportTypes(data);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      dirty.setDirty("types", false);
      setStatus("Exported type files to PBS_Output/");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["types.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWTYPE");
    const newEntry: PBSEntry = buildDefaultTypeEntry(newId, nextOrderForSource(resolvedTarget), resolvedTarget);
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
      order: nextOrderForSource(entry.sourceFile ?? "types.txt"),
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
      .filter((entry) => (entry.sourceFile ?? "types.txt") === sourceFile)
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

  const buildDefaultTypeEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "IconPosition", value: "0" },
      { key: "IsSpecialType", value: "" },
      { key: "IsPseudoType", value: "" },
      { key: "Weaknesses", value: "" },
      { key: "Resistances", value: "" },
      { key: "Immunities", value: "" },
      { key: "Flags", value: "" },
    ],
  });

  const typeOptions = useMemo(() => data.entries.map((entry) => entry.id), [data.entries]);

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  if (loading) {
    return <div className="panel">Loading types.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Types Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Types</h1>
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["types.txt"];
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
          <TypeDetail
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
            spriteHeight={typesSpriteHeight}
          />
        ) : (
          <div className="panel">Select a type to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) => (entry.sourceFile ?? "types.txt") === (activeEntry.sourceFile ?? "types.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "types.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Type</h2>
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
                    handleAddEntry(addSourceDraft || "types.txt");
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
        <div className="export-warning">
          Exports never overwrite <strong>PBS/types*.txt</strong>. Output goes to <strong>PBS_Output/</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export types.txt
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
  spriteHeight: number | null;
};

function TypeDetail({
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
  spriteHeight,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);
  const updateField = (index: number, key: string, value: string) => {
    const lowerBoolKeys = ["IsSpecialType", "IsPseudoType"];
    const nextValue = lowerBoolKeys.includes(key) ? value.toLowerCase() : value;
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value: nextValue } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const addField = () => {
    onChange({
      ...entry,
      fields: [...entry.fields, { key: "NewKey", value: "" }],
    });
  };
  const iconPositionRaw = entry.fields.find((field) => field.key === "IconPosition")?.value ?? "0";
  const iconPositionValue = Number(iconPositionRaw);
  const iconPositionValid =
    Number.isFinite(iconPositionValue) && Number.isInteger(iconPositionValue) && iconPositionValue >= 0;
  const iconPosition = iconPositionValid ? iconPositionValue : 0;
  const iconInBounds =
    iconPositionValid && (spriteHeight ? (iconPosition + 1) * 28 <= spriteHeight : false);

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
      {iconInBounds && (
        <div className="pokemon-sprite pokemon-sprite-left">
          <div
            className="type-sprite"
            style={{
              backgroundImage: "url(/assets/graphics/UI/types.png)",
              backgroundPosition: `0 -${iconPosition * 28}px`,
            }}
            aria-hidden="true"
          />
        </div>
      )}
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Type ID</label>
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
          const listKeys = ["Weaknesses", "Resistances", "Immunities"];
          if (listKeys.includes(field.key)) {
            return (
              <ListFieldEditor
                key={`${field.key}-${index}`}
                label={field.key}
                value={field.value}
                options={typeOptions}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
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

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input
                className="input"
                value={field.key}
                onChange={(event) => updateField(index, event.target.value, field.value)}
              />
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
  options: string[];
  onChange: (nextValue: string) => void;
  error?: string;
};

function ListFieldEditor({ label, value, options, onChange, error }: ListFieldEditorProps) {
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

  const handleSelectChange = (index: number, next: string) => {
    const nextItems = [...items];
    if (next === "") {
      nextItems.splice(index, 1);
    } else if (index === items.length) {
      nextItems.push(next);
    } else {
      nextItems[index] = next;
    }
    const normalized = nextItems.map((item) => item.toUpperCase());
    const deduped = normalized.filter((item, idx) => normalized.indexOf(item) === idx);
    onChange(deduped.join(","));
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
            <select
              className="input"
              value={item}
              onChange={(event) => handleSelectChange(index, event.target.value)}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button className="ghost" onClick={() => handleSelectChange(index, "")}>
              Remove
            </button>
          </div>
        ))}
        <div className="list-field-row">
          <select
            className="input"
            value=""
            onChange={(event) => handleSelectChange(items.length, event.target.value)}
          >
            <option value="">Add type...</option>
            {options
              .filter((option) => !items.includes(option))
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
        </div>
      </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

type FreeformListFieldEditorProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  error?: string;
};

function FreeformListFieldEditor({ label, value, onChange, error }: FreeformListFieldEditorProps) {
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

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    handleChange(items.length, next);
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
              value={item}
              onChange={(event) => handleChange(index, event.target.value)}
            />
            <button className="ghost" onClick={() => handleChange(index, "")}>
              Remove
            </button>
          </div>
        ))}
        <div className="list-field-row">
          <input
            className="input"
            value={draft}
            placeholder={`Add ${label}...`}
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
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "types.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "types.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}
