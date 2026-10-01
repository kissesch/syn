import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

const projectDir = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = path.resolve(projectDir, "../../packages/vault-crypto/src");
const vendorDir = path.join(projectDir, "web/vendor");

// Deploy to Cloudflare and Docker can build apps/api without the workspace.
// Keep a generated ESM bundle and declarations in the template. In a workspace,
// always generate (or verify) them against the canonical E2EE implementation.
export async function buildVaultCrypto({ check = false } = {}) {
  try {
    await access(path.join(sourceDir, "index.ts"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await access(path.join(vendorDir, "vault-crypto.js"));
    await access(path.join(vendorDir, "vault-crypto.d.ts"));
    return;
  }
  const result = await build({
    entryPoints: [path.join(sourceDir, "index.ts")],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2020",
    minify: true,
    write: false,
  });
  const files = new Map([["vault-crypto.js", result.outputFiles[0].contents]]);
  const declarations = ts.createProgram([path.join(sourceDir, "index.ts")], {
    declaration: true,
    emitDeclarationOnly: true,
    rootDir: sourceDir,
    outDir: vendorDir,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    types: [],
  });
  const emitted = declarations.emit(undefined, (filename, text) => {
    files.set(
      path.basename(filename) === "index.d.ts"
        ? "vault-crypto.d.ts"
        : path.basename(filename),
      Buffer.from(text),
    );
  });
  if (emitted.emitSkipped || emitted.diagnostics.length)
    throw new Error("Unable to generate vault crypto declarations");
  await mkdir(vendorDir, { recursive: true });
  if (check) {
    const existing = (await readdir(vendorDir)).sort();
    if (JSON.stringify(existing) !== JSON.stringify([...files.keys()].sort()))
      throw new Error(
        "Vault crypto vendor files are stale; run pnpm build:public",
      );
  }
  if (!check) {
    for (const name of await readdir(vendorDir)) {
      if (!files.has(name)) await rm(path.join(vendorDir, name));
    }
  }
  for (const [name, contents] of files) {
    const filename = path.join(vendorDir, name);
    if (check) {
      if (!(await readFile(filename)).equals(contents))
        throw new Error(
          `${filename} is stale; run pnpm build:public and commit the result`,
        );
    } else {
      // Avoid retriggering Wrangler's web/ watcher when nothing changed.
      const previous = await readFile(filename).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
        return null;
      });
      if (!previous?.equals(contents)) await writeFile(filename, contents);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildVaultCrypto({ check: process.argv.slice(2).includes("--check") });
}
