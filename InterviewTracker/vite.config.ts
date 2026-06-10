import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dbSyncPlugin } from "./vite-plugin-db-sync";

export default defineConfig({
  plugins: [react(), dbSyncPlugin({ file: "data/interview-tracker.db" })],
  server: { port: 5173, open: true },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: the app shell stays small and long-cached;
        // framer-motion ships only with the views that animate.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
        },
      },
    },
  },
});
