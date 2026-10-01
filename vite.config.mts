import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("./web", import.meta.url));
const pages = [
  "signin",
  "signup",
  "device",
  "vaults",
  "organizations",
  "invitations",
];
export default defineConfig({
  root,
  publicDir: "static",
  appType: "mpa",
  plugins: [react()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
    target: "es2020",
    rolldownOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, path.join(root, `${page}.html`)]),
      ),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      ["/api", "/v1"].map((prefix) => [
        prefix,
        {
          target: "http://127.0.0.1:8787",
          // Preserve the browser origin. The API explicitly trusts the dev UI origin.
          changeOrigin: false,
        },
      ]),
    ),
  },
});
