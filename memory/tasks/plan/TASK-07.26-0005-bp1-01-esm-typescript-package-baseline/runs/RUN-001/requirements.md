# Вимоги RUN-001

## Результат

Реалізувати exact-pinned Node.js 24 ESM TypeScript baseline для `@sagifire/extensia@0.1.0` і довести його чистими локальними package checks, включно з consumer smoke встановленого tarball.

## In scope

- Manifest, lockfile, TypeScript, ESLint, Prettier, Vitest/V8 та minimal source/test layout.
- Unbundled ESM output у `dist/`, explicit root/package manifest exports і publish allowlist.
- Автоматизований packed consumer runtime/type/internal-boundary smoke.
- Evidence усіх acceptance checks, independent audit і потрібна memory sync.

## Межі

- Не створювати runtime, domain contracts, facades, plugins, storage, drivers, journal або IoC composition implementation.
- Не змінювати exact dependency pins, ADR-0006, roadmap або статус BP1-02/BP1-03.
- Не перезаписувати незакомічені зміни завершеної `TASK-07.26-0006`.

## Критерій green gate

На Node.js 24 проходять `npm ci`, typecheck, build, lint, перевірка форматування, Vitest/V8 smoke, package dry-run, `publint`, `attw` і runtime/type/internal-subpath consumer checks для tarball.
