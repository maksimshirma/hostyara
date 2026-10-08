import React from "react";
import ReactDOM from "react-dom/client";
import "./theme/tokens.css";
import App from "./App";
import { AppTheme } from "./theme";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppTheme>
      <App />
    </AppTheme>
  </React.StrictMode>,
);
