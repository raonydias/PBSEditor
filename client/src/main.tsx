import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { DirtyProvider } from "./dirty";
import App from "./App";
import TypesPage from "./pages/TypesPage";
import AbilitiesPage from "./pages/AbilitiesPage";
import BerryPlantsPage from "./pages/BerryPlantsPage";
import RibbonsPage from "./pages/RibbonsPage";
import MovesPage from "./pages/MovesPage";
import ItemsPage from "./pages/ItemsPage";
import TrainerTypesPage from "./pages/TrainerTypesPage";
import PokemonPage from "./pages/PokemonPage";
import PokemonFormsPage from "./pages/PokemonFormsPage";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <TypesPage /> },
      { path: "types", element: <TypesPage /> },
      { path: "abilities", element: <AbilitiesPage /> },
      { path: "berry-plants", element: <BerryPlantsPage /> },
      { path: "ribbons", element: <RibbonsPage /> },
      { path: "moves", element: <MovesPage /> },
      { path: "items", element: <ItemsPage /> },
      { path: "trainer-types", element: <TrainerTypesPage /> },
      { path: "pokemon", element: <PokemonPage /> },
      { path: "pokemon-forms", element: <PokemonFormsPage /> },
    ],
  },
]);

createRoot(root).render(
  <React.StrictMode>
    <DirtyProvider>
      <RouterProvider router={router} />
    </DirtyProvider>
  </React.StrictMode>
);
