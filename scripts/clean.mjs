import { rmSync } from "node:fs";

for (const directory of ["coverage", "dist"]) {
  rmSync(new URL(`../${directory}`, import.meta.url), {
    force: true,
    recursive: true,
  });
}
