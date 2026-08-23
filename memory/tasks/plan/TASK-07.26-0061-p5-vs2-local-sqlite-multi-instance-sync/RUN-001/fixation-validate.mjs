import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(runDirectory, "../../../../..");
const fixationName =
  process.argv
    .find((argument) => argument.startsWith("--fixation="))
    ?.slice("--fixation=".length) ?? "FIX-001.md";
const fixationPath = join(runDirectory, "..", fixationName);
const fixation = readFileSync(fixationPath, "utf8");
const postApplication = process.argv.includes("--post");
const rows = [
  ...fixation.matchAll(
    /^\| `(memory\/[^`]+)` \| `([A-F0-9]{64})` \| (\d+) \|$/gm,
  ),
];

if (rows.length === 0) throw new Error("Expected at least one target row");

const sections = [...fixation.matchAll(/^### \d+\. `([^`]+)`$/gm)];
const results = [];
for (const [rowIndex, row] of rows.entries()) {
  const [, target, expectedHash, expectedOperationsText] = row;
  const section = sections.find((candidate) => candidate[1] === target);
  if (section === undefined) throw new Error(`Missing section for ${target}`);
  const nextSection = sections
    .filter((candidate) => candidate.index > section.index)
    .sort((left, right) => left.index - right.index)[0];
  const body = fixation.slice(
    section.index,
    nextSection?.index ?? fixation.indexOf("\n## Rationale", section.index),
  );
  const operations = [
    ...body.matchAll(
      /Operation \d+ — cardinality `(\d+)`\.[\s\S]*?`old`:\s*```text\n([\s\S]*?)\n```[\s\S]*?`new`:\s*```text\n([\s\S]*?)\n```/g,
    ),
  ];
  const expectedOperations = Number(expectedOperationsText);
  if (operations.length !== expectedOperations) {
    throw new Error(
      `${target}: expected ${expectedOperations} operations, got ${operations.length}`,
    );
  }

  const targetPath = join(repositoryRoot, target);
  const current = readFileSync(targetPath, "utf8");
  const actualHash = createHash("sha256")
    .update(current)
    .digest("hex")
    .toUpperCase();
  if (!postApplication && actualHash !== expectedHash) {
    throw new Error(`${target}: precondition hash mismatch`);
  }

  let simulated = current;
  for (const [operationIndex, operation] of operations.entries()) {
    const [, cardinalityText, oldText, newText] = operation;
    const cardinality = Number(cardinalityText);
    if (postApplication) {
      const oldCardinality = current.split(oldText).length - 1;
      const newCardinality = current.split(newText).length - 1;
      if (oldCardinality !== 0 || newCardinality < cardinality) {
        throw new Error(
          `${target} operation ${operationIndex + 1}: expected post cardinality old=0/new>=${cardinality}, got old=${oldCardinality}/new=${newCardinality}`,
        );
      }
      continue;
    }
    const actualCardinality = simulated.split(oldText).length - 1;
    if (actualCardinality !== cardinality) {
      throw new Error(
        `${target} operation ${operationIndex + 1}: expected cardinality ${cardinality}, got ${actualCardinality}`,
      );
    }
    simulated = simulated.replace(oldText, newText);
  }
  results.push({
    hash: actualHash,
    operations: operations.length,
    target,
  });
  if (rowIndex === rows.length - 1 && simulated.length === 0) {
    throw new Error("Impossible empty simulated target");
  }
}

process.stdout.write(
  `${JSON.stringify({ fixation: fixationName, mode: postApplication ? "post" : "pre", results, status: "PASS" })}\n`,
);
