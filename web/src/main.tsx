import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { ExternalDisplay } from "./ExternalDisplay.js";
import { initTheme } from "./theme.js";
import "./styles/theme.css";

initTheme(); // applied before first paint to avoid a flash of the default palette

const isExternalDisplay = new URLSearchParams(window.location.search).get("display") === "external";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isExternalDisplay ? <ExternalDisplay /> : <App />}</React.StrictMode>,
);
