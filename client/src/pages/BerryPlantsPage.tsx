import { useEffect, useMemo, useState } from "react";
import { BerryPlantsFile, PBSEntry } from "@pbs/shared";
import { exportBerryPlants, getBerryPlants } from "../api";

const emptyFile: BerryPlantsFile = { entries: [] };

export default function BerryPlantsPage() {
  const [data, setData] = useState<BerryPlantsFile>(emptyFile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getBerryPlants()
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setActiveId(result.entries[0]?.id ?? null);
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

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

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
    if (!nextId) return "Berry Plant ID cannot be empty.";
    if (!/^[A-Z]+$/.test(nextId)) return "Berry Plant ID must be A-Z only.";
    if (data.entries.some((item) => item.id.toLowerCase() === nextId.toLowerCase() && item.id !== entry.id)) {
      return `Berry Plant ${nextId} already exists.`;
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
    } else if (!/^-?\d+$/.test(hours)) {
      errors.HoursPerStage = "HoursPerStage must be an integer.";
    }

    const drying = getField("DryingPerHour").trim();
    if (!drying) {
      errors.DryingPerHour = "DryingPerHour is required.";
    } else if (!/^-?\d+$/.test(drying)) {
      errors.DryingPerHour = "DryingPerHour must be an integer.";
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

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportBerryPlants(data);
      setStatus("Exported to PBS_Output/berry_plants.txt");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = () => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const newId = nextAvailableId("NEWBERRYPLANT");
    const newEntry: PBSEntry = buildDefaultBerryPlantEntry(newId, nextOrder());
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
      order: nextOrder(),
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

  const nextOrder = () => Math.max(0, ...data.entries.map((entry) => entry.order + 1));

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

  const buildDefaultBerryPlantEntry = (id: string, order: number): PBSEntry => ({
    id,
    order,
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
          <h1>Berry Plants Editor</h1>
          <button className="ghost" onClick={handleAddEntry}>
            Add New
          </button>
        </div>
        <div className="list">
          {data.entries.map((entry) => (
            <button
              key={entry.id}
              className={`list-item ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-title">{entry.id}</div>
              <div className="list-sub">{entry.fields.find((f) => f.key === "HoursPerStage")?.value ?? "?"}h/stage</div>
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
            idError={idError}
            onSetIdError={setIdError}
            fieldErrors={fieldErrors}
          />
        ) : (
          <div className="panel">Select a berry plant to edit.</div>
        )}
      </section>
      <section className="export-bar">
        <div className="export-warning">
          Exports never overwrite <strong>PBS/berry_plants.txt</strong>. Output goes to <strong>PBS_Output/berry_plants.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
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
  idError,
  onSetIdError,
  fieldErrors,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value } : field
    );
    onChange({ ...entry, fields: nextFields });
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
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Duplicate
          </button>
          <button className="danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
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
                  <input className="input" value="MinYield" readOnly />
                  <input
                    className="input"
                    value={yieldMin ?? ""}
                    onChange={(event) => {
                      const nextMin = event.target.value;
                      const nextValue = `${nextMin},${yieldMax ?? ""}`;
                      setFieldValue("Yield", nextValue);
                    }}
                  />
                </div>
                <div className="field-row">
                  <input className="input" value="MaxYield" readOnly />
                  <input
                    className="input"
                    value={yieldMax ?? ""}
                    onChange={(event) => {
                      const nextMax = event.target.value;
                      const nextValue = `${yieldMin ?? ""},${nextMax}`;
                      setFieldValue("Yield", nextValue);
                    }}
                  />
                </div>
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
