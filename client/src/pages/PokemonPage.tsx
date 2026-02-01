import { useEffect, useState } from "react";
import { TypesFile } from "@pbs/shared";
import { getTypes } from "../api";

const emptyFile: TypesFile = { entries: [] };

export default function PokemonPage() {
  const [types, setTypes] = useState<TypesFile>(emptyFile);
  const [type1, setType1] = useState<string>("");
  const [type2, setType2] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTypes()
      .then((data) => {
        setTypes(data);
        setType1(data.entries[0]?.id ?? "");
        setType2(data.entries[1]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="panel">
      <h1>Pokemon Editor (Skeleton)</h1>
      <p className="muted">
        This page will be expanded to load <strong>pokemon.txt</strong>. For now it demonstrates
        cross-file dropdowns sourced from <strong>types.txt</strong>.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="field-list">
        <div className="field-row">
          <label className="label">Type1</label>
          <select className="input" value={type1} onChange={(event) => setType1(event.target.value)}>
            {types.entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <label className="label">Type2</label>
          <select className="input" value={type2} onChange={(event) => setType2(event.target.value)}>
            <option value="">(None)</option>
            {types.entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
