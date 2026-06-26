import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Tauri: don't let Vite watch the Rust side — it locks files and crashes the watcher
  server: {
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});