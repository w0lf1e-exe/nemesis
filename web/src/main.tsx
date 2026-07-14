import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { ExternalDisplay } from "./ExternalDisplay.js";
import "./styles/theme.css";

const isExternalDisplay = new URLSearchParams(window.location.search).get("display") === "external";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isExternalDisplay ? <ExternalDisplay /> : <App />}</React.StrictMode>,
);
