import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProjectStatus } from "@pbs/shared";
import { getProjectStatus } from "./api";
import TypesPage from "./pages/TypesPage";
import PokemonPage from "./pages/PokemonPage";

export default function App() {
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    getProjectStatus()
      .then(setStatus)
      .catch((err: Error) => setStatusError(err.message));
  }, []);

  const missing = new Set(status?.missingFiles ?? []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">PBS Editor</div>
          <div className="brand-sub">Local Essentials Project</div>
        </div>
        <nav className="nav">
          <NavLink to="/types" className="nav-link">
            Types
            {missing.has("types.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/pokemon" className="nav-link">
            Pokemon
            {missing.has("pokemon.txt") && <span className="badge">Missing</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          {statusError ? (
            <span className="error">Status unavailable</span>
          ) : (
            <>
              Output is written to <strong>PBS_Output</strong>
            </>
          )}
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<TypesPage />} />
          <Route path="/types" element={<TypesPage />} />
          <Route path="/pokemon" element={<PokemonPage />} />
        </Routes>
      </main>
    </div>
  );
}
