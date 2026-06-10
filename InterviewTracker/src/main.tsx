import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
// Self-hosted Inter Variable (single woff2, hashed + cached by Vite).
import "@fontsource-variable/inter";
import "./styles/index.css";

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
