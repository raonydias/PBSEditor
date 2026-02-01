import { useEffect, useMemo, useState } from "react";
import { PBSEntry, TypesFile } from "@pbs/shared";
import { exportTypes, getTypes } from "../api";

const emptyFile: TypesFile = { entries: [] };

export default function TypesPage() {
  const [data, setData] = useState<TypesFile>(emptyFile);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getTypes()
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

  const updateEntry = (updated: PBSEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    }));
  };

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportTypes(data);
      setStatus("Exported to PBS_Output/types.txt");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
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
        <h1>Types Editor</h1>
        <div className="list">
          {data.entries.map((entry) => (
            <button
              key={entry.id}
              className={`list-item ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-title">{entry.id}</div>
              <div className="list-sub">{entry.fields.find((f) => f.key === "Name")?.value ?? "(no name)"}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <TypeDetail entry={activeEntry} onChange={updateEntry} />
        ) : (
          <div className="panel">Select a type to edit.</div>
        )}
      </section>
      <section className="export-bar">
        <div className="export-warning">
          Exports never overwrite <strong>PBS/types.txt</strong>. Output goes to <strong>PBS_Output/types.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport}>
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
};

function TypeDetail({ entry, onChange }: DetailProps) {
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

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.id}</h2>
        <button className="ghost" onClick={addField}>
          Add Field
        </button>
      </div>
      <div className="field-list">
        {entry.fields.map((field, index) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
