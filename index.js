#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { $ } from "execa";
import { rmSync } from "node:fs";
import { gzipSizeFromFile } from "gzip-size";
import { file as brotliSizeFromFile } from "brotli-size";
import prettyBytes from "pretty-bytes";
import readPackageJSON from "read-package-json-fast";
import { dedent } from "ts-dedent";

const options = {
  help: { short: "h", type: "boolean" },
  version: { short: "v", type: "boolean" },
  persist: { type: "boolean", default: true },
};
const { values, positionals } = parseArgs({ options, strict: false });

const { name, version } = await readPackageJSON(
  new URL("package.json", import.meta.url),
);

if (values.help) {
  // prettier-ignore
  console.log(dedent(`
    ${name} v${version}
    Usage
      $ vite-size [package-name]
    Examples
      $ vite-size
      $ vite-size lodash
  `));
  process.exit(0);
}

if (values.version) {
  console.log(`${name} v${version}`);
  process.exit(0);
}

let packageName;
let packageSpecifier;
if (positionals[0]) {
  if (positionals[0].includes(":")) {
    if (positionals[0].startsWith("file:")) {
      packageName = "my-package";
      packageSpecifier = `file:${resolve(
        positionals[0].slice("file:".length),
      )}`;
    } else {
      packageName = "my-package";
      packageSpecifier = positionals[0];
    }
  } else {
    packageName = positionals[0];
    packageSpecifier = "latest";
  }
} else {
  packageName = (await readPackageJSON("package.json")).name;
  packageSpecifier = "*";
}

const fileTree = {
  "package.json": JSON.stringify({
    private: true,
    devDependencies: {
      vite: "^4.0.0",
      [packageName]: packageSpecifier,
    },
  }),
  "vite.config.mjs": `
    import { defineConfig } from 'vite'

    // https://vitejs.dev/config/
    export default defineConfig(${JSON.stringify({
      build: {
        manifest: true,
      },
    })});
  `,
  "index.html": `
    <script type="module">
      import(${JSON.stringify(packageName)});
    </script>
  `,
};

await mkdir(".cache/vite-size", { recursive: true });
if (!values.persist) {
  process.on("exit", () => {
    rmSync(".cache/vite-size", { recursive: true });
  });
}

for (const [name, text] of Object.entries(fileTree)) {
  await writeFile(join(".cache/vite-size", name), text);
}

const $$ = $({ cwd: ".cache/vite-size" });
await $$`npm install`;
await $$`npx vite build`;

const manifest = JSON.parse(
  await readFile(".cache/vite-size/dist/manifest.json", "utf8"),
);
const bundleFile = join(
  ".cache/vite-size/dist",
  manifest[manifest["index.html"].dynamicImports[0]].file,
);

const none = (await readFile(bundleFile)).byteLength;
const gzip = await gzipSizeFromFile(bundleFile);
const brotli = await brotliSizeFromFile(bundleFile);

console.log(packageName, packageSpecifier);
console.log("none:   %s", prettyBytes(none));
console.log("gzip:   %s", prettyBytes(gzip));
console.log("brotli: %s", prettyBytes(brotli));
