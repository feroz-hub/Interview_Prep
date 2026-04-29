import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dbSyncPlugin } from "./vite-plugin-db-sync";

export default defineConfig({
  plugins: [react(), dbSyncPlugin({ file: "data/interview-tracker.db" })],
  server: { port: 5173, open: true }
});
