// ─────────────────────────────────────────────────────────────────────────────
// main.jsx — Application entry point
// Mounts the React app into the DOM.
// AuthProvider is handled inside App.jsx to keep this file minimal.
// ─────────────────────────────────────────────────────────────────────────────

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
