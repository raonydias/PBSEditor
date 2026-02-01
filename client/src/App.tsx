import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProjectStatus } from "@pbs/shared";
import { getProjectStatus } from "./api";
import TypesPage from "./pages/TypesPage";
import AbilitiesPage from "./pages/AbilitiesPage";
import BerryPlantsPage from "./pages/BerryPlantsPage";
import RibbonsPage from "./pages/RibbonsPage";
import MovesPage from "./pages/MovesPage";
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
          <NavLink to="/abilities" className="nav-link">
            Abilities
            {missing.has("abilities.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/berry-plants" className="nav-link">
            Berry Plants
            {missing.has("berry_plants.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/ribbons" className="nav-link">
            Ribbons
            {missing.has("ribbons.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/moves" className="nav-link">
            Moves
            {missing.has("moves.txt") && <span className="badge">Missing</span>}
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
          <Route path="/abilities" element={<AbilitiesPage />} />
          <Route path="/berry-plants" element={<BerryPlantsPage />} />
          <Route path="/ribbons" element={<RibbonsPage />} />
          <Route path="/moves" element={<MovesPage />} />
          <Route path="/pokemon" element={<PokemonPage />} />
        </Routes>
      </main>
    </div>
  );
}
