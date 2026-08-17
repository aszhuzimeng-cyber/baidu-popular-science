import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "relative-public-assets",
      enforce: "pre",
      transform(code, id) {
        if (id.includes("node_modules") || !/\.[jt]sx?$/.test(id)) return null;
        return code.replace(/(["'`])\/assets\//g, "$1./assets/");
      },
    },
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5175,
    strictPort: false,
  },
});
