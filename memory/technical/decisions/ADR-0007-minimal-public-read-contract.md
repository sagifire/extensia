# ADR-0007: Мінімальний public read contract

Status: accepted
Date: 2026-07-10
Applied Artifact: `APP-07.26-0021-001` (published)

## Контекст

Phase 2 потребує smallest application-visible read boundary, не перетворюючи draft signatures, Core/IoC, write semantics або Storage Driver на public contract. Незалежні BP2-02/BP2-03 також не можуть створювати два shared read contracts або змагатися за один source file.

## Рішення

- Root-only side-effect-free `createExtensia(config)` повертає `ExtensiaModule`; safe descriptor extraction не викликає getters, invalid/accessor envelope стає sentinel і `start()` повертає `CONFIG_INVALID` до resources. Factory capture-ить driver identity у новий frozen envelope; caller envelope не reread, driver не clone/freeze.
- Module має six-state lifecycle, normalized discriminated `ExtensiaResult`, dedicated nullable `query()`/`storage()` і safe `inspect()`. Registry freeze та atomic ready publication передують видимості facades; stop close-and-drain-ить admitted reads перед disposal.
- Public catalog обмежено `query.getResource` і `query.getResourceTree`; missing та invalid ID мають distinct codes. `storage.createResource(input: unknown)` — `experimental-phase-2` readonly proof із `never` success і `STORAGE_READONLY` before input inspection/mutation.
- Registry належить Module lifecycle. Reserved `query`/`storage` потребують trusted composition-owned lease `extensia.default-api`; names не normalізуються silently, provider descriptors synchronous, async creation Extensia-owned.
- Один internal consumer-owned seam materialize-иться окремою BP2-01A у `src/system-extensions/default-api/resource-read-port.ts`. BP2-02 bind/adapt-ить provider, BP2-03 володіє public adapter; source seam не експортується.

## Наслідки

- Public application boundary не розкриває Core, resolver, IoC, tokens або internal subpaths.
- BP2-02/BP2-03 можуть активуватися паралельно лише після `APP-07.26-0021-001`, `done` BP2-01A і власних activation decisions.
- Final write inputs, final Storage Driver, full error catalog, plugin/custom facade API, diagnostics compatibility і release policy лишаються owner gates.

## Відхилені альтернативи

- Public class constructor або one-shot `startExtensia` — змішують construction/lifecycle або передчасно заморожують class shape.
- Always-present/throwing facades, nullable draft results, success-null missing Resource і full draft query catalog — порушують ready boundary або розширюють scope.
- Final `CreateResourceInput`, generic `execute(command)` або приховування `storage` — або freeze write design, або не доводять readonly boundary.
- Silent name normalization, self-asserted system flag, generic custom lookup/raw resolver, shared test-only contract чи duplicate read token — створюють collision, provenance або ownership defects.
