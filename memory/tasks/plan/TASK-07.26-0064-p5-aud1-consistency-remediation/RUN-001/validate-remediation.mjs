import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runDirectory = dirname(fileURLToPath(import.meta.url));
const taskDirectory = resolve(runDirectory, "..");
const repositoryRoot = resolve(runDirectory, "../../../../..");
const mode = process.argv.includes("--post") ? "post" : "pre";

if (process.argv.includes("--pre") && process.argv.includes("--post")) {
  throw new Error("Оберіть рівно один режим перевірки: --pre або --post");
}

const targets = [
  {
    path: "memory/product/roadmap.md",
    pre: "4b9ef7a4eed121e619c8c866565f7cc6a0ddc0db65563fa1087d5b84b5e5a978",
    post: "694089b8c92ca4bbb53825ccee0ad1ae3b1780edb26c61d55b01bbe41cfe2540",
    replacements: [
      {
        old: "Стан: P5-RS1 accepted; P5-DG1/P5-DG2 exact targets accepted/applied; P5-WP1, P5-HARD1, P5-VS1 і P5-VS2 accepted; TASK-0060/FIX-001 applied, TASK-0061/FIX-001 applied. P5-STAB/P5-AUD1 inactive.",
        new: "Стан: P5-RS1 accepted; P5-DG1/P5-DG2 exact targets accepted/applied; P5-WP1, P5-HARD1, P5-VS1, P5-VS2 і P5-STAB accepted/completed; TASK-0060/FIX-001 і TASK-0061/FIX-001 applied. Початковий аудит P5-AUD1 у TASK-0063 виявив два зауваження рівня P2. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Human gate фази 5 і фаза 6 неактивні; канонічну підтримку топологій не заявлено до прийнятого P5-AUD1 та явного human gate фази 5.",
      },
      {
        old: "Wave IDs: `P5-RS1` + `P5-DG1` + `P5-DG2` -> `P5-WP1` generation/coordinator foundation -> `P5-HARD1` internal retry/single-flight/lifecycle -> `P5-VS1` lazy + public explicit refresh/config -> completed `P5-VS2` concrete multi-instance sync/polling/contention -> pending `P5-STAB` -> `P5-AUD1` -> human gate.",
        new: "Wave IDs: `P5-RS1` + `P5-DG1` + `P5-DG2` -> `P5-WP1` generation/coordinator foundation -> `P5-HARD1` internal retry/single-flight/lifecycle -> `P5-VS1` lazy + public explicit refresh/config -> completed `P5-VS2` concrete multi-instance sync/polling/contention -> завершений `P5-STAB` (`full/full` unsupported; designated-writer `full/readonly` — єдиний кандидат) -> початковий аудит `P5-AUD1` у TASK-0063 (два зауваження P2) -> розподіл відповідальності (Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063) -> human gate.",
      },
    ],
  },
  {
    path: "memory/technical/read-model-completeness-contract.md",
    pre: "30c9c1a799f8008f41f91b4e74232920d9d8b21a4a9d027fbdacba7c0aa57369",
    post: "d022005b2662ef3243d2091d8bf84c4684eebbbdeadda3cb3eb5e15548af4c12",
    replacements: [
      {
        old: "`P5-WP1`, `P5-HARD1`, `P5-VS1` і `P5-VS2` materialized та accepted у TASK-0058/0059/0060/0061; відповідні required fixations applied. `P5-STAB` -> `P5-AUD1` лишаються prepared, inactive й потребують separate explicit activation. P5-VS2 acceptance/application не активує downstream packages.",
        new: "`P5-WP1`, `P5-HARD1`, `P5-VS1`, `P5-VS2` і `P5-STAB` materialized та accepted/completed у TASK-0058/0059/0060/0061/0062; відповідні required fixations applied. Початковий аудит P5-AUD1 у TASK-0063 виявив два зауваження рівня P2. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Канонічну підтримку топологій не заявлено до прийнятого P5-AUD1 та явного human gate фази 5; симетрична `full/full` лишається unsupported, designated-writer `full/readonly` — єдиний кандидат. Приймання/застосування P5-VS2 не активувало наступні пакети; кожна їх активація потребувала окремого явного рішення owner.",
      },
      {
        old: "P5-VS1 current/materialization sync застосовано через TASK-0060/FIX-001; P5-VS2 current/materialization sync застосовується exact через TASK-0061/FIX-001 у domain current state, architecture, P5 contracts і roadmap. Product requirements, target domain invariants і normative completeness rules не змінюються.",
        new: "P5-VS1 current/materialization sync застосовано через TASK-0060/FIX-001; P5-VS2 current/materialization sync застосовано exact через TASK-0061/FIX-001 у domain current state, architecture, P5 contracts і roadmap. TASK-0064/FIX-001 зберігає канонічний запис актуального стану для accepted/completed P5-STAB і зауважень початкового аудиту P5-AUD1. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Product requirements, target domain invariants і normative completeness rules не змінюються.",
      },
    ],
  },
  {
    path: "memory/technical/open-questions.md",
    pre: "4d9c81d147c487b6f3f9b7c50ad4084f84b584687a0c8bc948e0815550a5182c",
    post: "ff380285a131acc80edaa98a3ffe58a485f4a87827b7d9269f10baee0a580b00",
    replacements: [
      {
        old: "- P5-DG2 accepted target owns supported volatile cursor, legacy `static-unsupported` branch, admission-epoch explicit refresh + opt-in polling, bounded startup/refresh retry, topology gate і one local/external coordinator; implementation/support evidence remains pending.",
        new: "- P5-DG2 accepted target owns supported volatile cursor, legacy `static-unsupported` branch, admission-epoch explicit refresh + opt-in polling, bounded startup/refresh retry, topology gate і one local/external coordinator; докази реалізації матеріалізовано й прийнято у P5-WP1/P5-HARD1/P5-VS1/P5-VS2, а докази стабілізації прийнято й завершено у P5-STAB. Початковий аудит P5-AUD1 у TASK-0063 виявив два зауваження рівня P2. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Канонічну підтримку топологій не заявлено до прийнятого P5-AUD1 та явного human gate фази 5.",
      },
      {
        old: "- Initial two-process `full/full`/`full/readonly` candidates remain unsupported until P5 implementation, stabilization, audit and human gate; designated writer recommended.",
        new: "- P5-STAB accepted/completed: симетрична двопроцесна `full/full` лишається unsupported; designated-writer `full/readonly` — єдиний кандидат, а не supported topology. Початковий аудит P5-AUD1 у TASK-0063 виявив два зауваження рівня P2. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Канонічну підтримку не заявлено до прийнятого P5-AUD1 та явного human gate фази 5.",
      },
      {
        old: "- Still open: executable support verdict/budgets, arbitrary instance count, retention/compaction, durable checkpoint, notification implementation, multi-host/HA і broader profiles.",
        new: "- Досі відкрито: явне рішення human gate фази 5 щодо підтримки, довільна кількість екземплярів, збереження/компакція, durable checkpoint, реалізація сповіщень, multi-host/HA і ширші профілі.",
      },
    ],
  },
  {
    path: "memory/technical/architecture.md",
    pre: "4f05e070c74df5e5e05b323ba84d190964813a73dad6d07f4ed9590e2ad85716",
    post: "41cdf4e9b15502c2b16d45be6df37d1a4784fcfd74dd966771a8c4ca4c0150cc",
    replacements: [
      {
        old: "Lifecycle-owned polling стартує тільки після ready, використовує той самий admission-epoch actor, coalesce-ить local cursor-gap wake-up, закриває timer до actor stop і drain-ить observation до driver close. Rerunnable process evidence містить successful lock-wait та lock-to-success retry samples, phase-aligned polling-actor barrier, full/full caller-visible contention і full/readonly zero-write/visibility. Synchronous `DatabaseSync` та rollback-journal contention лишаються architecture pressure; process samples не є fairness/stale-age/SLA certificate, і P5-STAB може звузити support до designated-writer `full/readonly`. Жодна topology не supported до P5-STAB, P5-AUD1 і explicit human gate.",
        new: "Lifecycle-owned polling стартує тільки після ready, використовує той самий admission-epoch actor, coalesce-ить local cursor-gap wake-up, закриває timer до actor stop і drain-ить observation до driver close. Rerunnable process evidence містить successful lock-wait та lock-to-success retry samples, phase-aligned polling-actor barrier, full/full caller-visible contention і full/readonly zero-write/visibility. Synchronous `DatabaseSync` та rollback-journal contention лишаються architecture pressure; process samples не є fairness/stale-age/SLA certificate. P5-STAB accepted/completed і зафіксував: симетрична `full/full` лишається unsupported, designated-writer `full/readonly` — єдиний кандидат, а не supported topology. Початковий аудит P5-AUD1 у TASK-0063 виявив два зауваження рівня P2. Усунення зауважень фіксує TASK-0064; незалежну повторну перевірку та її результат фіксує TASK-0063. Канонічну підтримку не заявлено до прийнятого P5-AUD1 та явного human gate фази 5.",
      },
    ],
  },
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(bufferOrText) {
  return createHash("sha256").update(bufferOrText).digest("hex");
}

function readUtf8(relativeOrAbsolutePath) {
  const absolutePath = relativeOrAbsolutePath.startsWith(repositoryRoot)
    ? relativeOrAbsolutePath
    : resolve(repositoryRoot, relativeOrAbsolutePath);
  const buffer = readFileSync(absolutePath);
  assert(
    !(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf),
    `UTF-8 BOM заборонено: ${absolutePath}`,
  );
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  return { absolutePath, buffer, text };
}

function occurrenceCount(text, needle) {
  let count = 0;
  let cursor = 0;
  while (true) {
    const index = text.indexOf(needle, cursor);
    if (index === -1) return count;
    count += 1;
    cursor = index + needle.length;
  }
}

function fieldValue(text, label) {
  const prefix = `${label}: `;
  const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith(prefix));
  assert(line, `Відсутнє поле ${label}`);
  return line.slice(prefix.length);
}

function verifyLocalLinks(files) {
  let checked = 0;
  for (const file of files) {
    const { absolutePath, text } = readUtf8(file);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const href = match[1];
      if (/^(?:https?:\/\/|mailto:|#)/.test(href)) continue;
      const linkPath = href.split("#", 1)[0];
      if (linkPath.length === 0) continue;
      assert(
        existsSync(resolve(dirname(absolutePath), decodeURIComponent(linkPath))),
        `Відсутнє локальне Markdown-посилання ${href} у ${absolutePath}`,
      );
      checked += 1;
    }
  }
  return checked;
}

const expectedTargetPaths = [
  "memory/product/roadmap.md",
  "memory/technical/architecture.md",
  "memory/technical/open-questions.md",
  "memory/technical/read-model-completeness-contract.md",
].sort();
assert(
  JSON.stringify(targets.map((target) => target.path).sort()) ===
    JSON.stringify(expectedTargetPaths),
  "Набір цілей валідатора відрізняється від чотирифайлової межі",
);
assert(
  targets.reduce((sum, target) => sum + target.replacements.length, 0) === 8,
  "Валідатор має визначати рівно вісім замін",
);

const fix = readUtf8(resolve(taskDirectory, "FIX-001.md"));
assert(/^Requirement: required$/m.test(fix.text), "FIX-001 має лишатися required");

const manifestStart = "<!-- VALIDATOR-MANIFEST-START -->";
const manifestEnd = "<!-- VALIDATOR-MANIFEST-END -->";
assert(
  fix.text.indexOf(manifestStart) >= 0 && fix.text.indexOf(manifestEnd) >= 0,
  "Відсутні маркери маніфесту валідатора FIX-001",
);
const manifestBody = fix.text.slice(
  fix.text.indexOf(manifestStart) + manifestStart.length,
  fix.text.indexOf(manifestEnd),
);
const manifestRows = [...manifestBody.matchAll(
  /\| `([^`]+)` \| `([0-9a-f]{64})` \| `([0-9a-f]{64})` \|/g,
)].map((match) => ({ path: match[1], pre: match[2], post: match[3] }));
assert(manifestRows.length === targets.length, "Кількість рядків маніфесту FIX-001 не збігається");
for (const target of targets) {
  const row = manifestRows.find((candidate) => candidate.path === target.path);
  assert(row, `У маніфесті FIX-001 відсутній ${target.path}`);
  assert(row.pre === target.pre, `Preimage FIX-001 не збігається для ${target.path}`);
  assert(row.post === target.post, `Postimage FIX-001 не збігається для ${target.path}`);
  for (const replacement of target.replacements) {
    assert(fix.text.includes(replacement.old), `У FIX-001 відсутній old payload для ${target.path}`);
    assert(fix.text.includes(replacement.new), `У FIX-001 відсутній new payload для ${target.path}`);
  }
}
assert(
  JSON.stringify(manifestRows.map((row) => row.path).sort()) ===
    JSON.stringify(expectedTargetPaths),
  "Маніфест FIX-001 містить незаявлену ціль",
);

const targetResults = [];
for (const target of targets) {
  const current = readUtf8(target.path);
  const currentHash = sha256(current.buffer);
  let dryRun = current.text;
  if (mode === "pre") {
    assert(currentHash === target.pre, `Preimage hash не збігається для ${target.path}`);
    for (const replacement of target.replacements) {
      assert(
        occurrenceCount(current.text, replacement.old) === 1,
        `Очікувався один old anchor у ${target.path}`,
      );
      assert(
        occurrenceCount(current.text, replacement.new) === 0,
        `Виявлено передчасне канонічне застосування у ${target.path}`,
      );
      dryRun = dryRun.replace(replacement.old, replacement.new);
    }
    assert(sha256(dryRun) === target.post, `Dry-run postimage не збігається для ${target.path}`);
  } else {
    assert(currentHash === target.post, `Postimage hash не збігається для ${target.path}`);
    for (const replacement of target.replacements) {
      assert(
        occurrenceCount(current.text, replacement.old) === 0,
        `Old anchor лишився після застосування у ${target.path}`,
      );
      assert(
        occurrenceCount(current.text, replacement.new) === 1,
        `Очікувався один застосований anchor у ${target.path}`,
      );
    }
  }
  targetResults.push({ path: target.path, hash: currentHash });
}

for (const path of [
  "memory/tasks/plan/TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/FIX-002.md",
  "memory/tasks/plan/TASK-07.26-0056-p5-dg1-read-model-completeness-query-contract/FIX-003.md",
]) {
  const { text } = readUtf8(path);
  assert(/^Status: applied$/m.test(text), `Статус P2-002 не applied: ${path}`);
  assert(!/^Status: approved$/m.test(text), `Застарілий approved status P2-002 лишився: ${path}`);
}

const task = readUtf8(resolve(taskDirectory, "task.md"));
const result = readUtf8(resolve(runDirectory, "result.md"));
const lifecycle = {
  task: fieldValue(task.text, "Task Status"),
  dashboardRun: fieldValue(task.text, "Run Status"),
  resultRun: fieldValue(result.text, "Run Status"),
  fix: fieldValue(fix.text, "Status"),
  decision: fieldValue(fix.text, "Decision"),
  applied: fieldValue(fix.text, "Applied"),
};
assert(
  lifecycle.dashboardRun === lifecycle.resultRun,
  "Lifecycle task dashboard і RUN-001 result відрізняється",
);

if (mode === "pre") {
  const allowedPreStates = [
    {
      task: "active",
      run: "active",
      fix: "proposed",
      decision: "pending",
      applied: "no",
    },
    {
      task: "review",
      run: "review-ready",
      fix: "proposed",
      decision: "pending",
      applied: "no",
    },
    {
      task: "review",
      run: "finalizing",
      fix: "approved",
      decision: "approved",
      applied: "no",
    },
  ];
  assert(
    allowedPreStates.some((state) =>
      state.task === lifecycle.task &&
      state.run === lifecycle.resultRun &&
      state.fix === lifecycle.fix &&
      state.decision === lifecycle.decision &&
      state.applied === lifecycle.applied),
    `Недійсний pre-application lifecycle: ${JSON.stringify(lifecycle)}`,
  );
} else {
  const allowedPostStates = [
    { task: "review", run: "finalizing" },
    { task: "done", run: "completed" },
  ];
  assert(
    lifecycle.fix === "applied" &&
      lifecycle.decision === "approved" &&
      lifecycle.applied === "yes",
    `Режим post потребує approved/applied disposition FIX: ${JSON.stringify(lifecycle)}`,
  );
  assert(
    allowedPostStates.some((state) =>
      state.task === lifecycle.task && state.run === lifecycle.resultRun),
    `Недійсний post-application task/run lifecycle: ${JSON.stringify(lifecycle)}`,
  );
  const applicationEvidence =
    /## Application evidence\r?\n([\s\S]*)/.exec(fix.text)?.[1] ?? "";
  assert(
    applicationEvidence.includes("Канонічні заміни застосовано: yes") &&
      applicationEvidence.includes("Профіль застосування: exact FIX-001 payload"),
    "Режим post потребує непорожні маркери доказів exact application",
  );
}

const markdownFiles = [
  resolve(taskDirectory, "index.md"),
  resolve(taskDirectory, "task.md"),
  resolve(taskDirectory, "FIX-001.md"),
  resolve(runDirectory, "index.md"),
  resolve(runDirectory, "context.md"),
  resolve(runDirectory, "result.md"),
];
const checkedLinks = verifyLocalLinks(markdownFiles);

console.log(JSON.stringify({
  status: "PASS",
  mode,
  targetCount: targets.length,
  replacementCount: targets.reduce(
    (sum, target) => sum + target.replacements.length,
    0,
  ),
  p2002Statuses: "applied/applied",
  lifecycle,
  checkedLinks,
  targetResults,
}, null, 2));
