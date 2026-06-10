import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
// Self-hosted Inter Variable (single woff2, hashed + cached by Vite).
import "@fontsource-variable/inter";
import "./styles/index.css";

// Offline + instant repeat visits: hashed assets are served cache-first, the
// shell network-first. Production only — the dev server must stay untouched.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("SW registration failed:", e);
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root")!);

// DEV-only primitives playground. Reach it at /?_play=1 on localhost.
// In production builds the entire branch is dead-stripped and the
// playground module is never bundled.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("_play")) {
  void import("./components/_primitives/__playground").then((mod) => {
    const Playground = mod.default;
    root.render(
      <React.StrictMode>
        <Playground />
      </React.StrictMode>
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
