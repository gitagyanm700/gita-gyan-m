import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { registerPwa } from "./utils/pwaManager.js";

// Register PWA service worker and live auto-updates
registerPwa();

// Clear active button focus ring when clicking outside interactive elements
if (typeof window !== "undefined") {
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("button, a, input, select, textarea, [tabindex]")) {
      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);