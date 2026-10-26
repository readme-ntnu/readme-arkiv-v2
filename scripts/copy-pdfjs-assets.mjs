#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const destination = path.resolve("public", "pdfjs");
const assetDirectories = ["cmaps", "iccs", "standard_fonts", "wasm"];

fs.rmSync(destination, { recursive: true, force: true });

for (const directory of assetDirectories) {
  fs.cpSync(
    path.join(pdfjsRoot, directory),
    path.join(destination, directory),
    {
      recursive: true,
    },
  );
}
