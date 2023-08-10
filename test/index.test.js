import test from "node:test";
import assert from "node:assert";
import { $ } from "execa";

test("works with npm packages", async () => {
  const $$ = $({ stdio: "inherit" });
  await $$`node index.js lodash`;
});

test("works when inside package", async () => {
  const $$ = $({
    stdio: "inherit",
    cwd: "test/local-package",
  });
  await $$`node ../../index.js`;
});
