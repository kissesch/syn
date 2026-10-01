import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { buildVaultCrypto } from "./build-vault-crypto.mjs";

const projectDir = fileURLToPath(new URL("../", import.meta.url));
await buildVaultCrypto();
await build({
  configFile: path.join(projectDir, "vite.config.mts"),
  build: { outDir: path.join(projectDir, "public"), emptyOutDir: true },
});
