# ADR-0013: Client-server transactional Storage Driver family

Status: accepted
Date: 2026-07-15

## Контекст

PostgreSQL/MySQL дають transactional metadata/payload/journal commit, але додають network outcome ambiguity, pooled session state, server-local locks, failover/topology fencing, configuration-dependent durability і різну DDL semantics. Literal local `commit resolve/reject` без reconciliation створив би false rejection після server commit.

## Рішення

- Прийняти один semantic `client-server-transactional` family contract і окремі PostgreSQL/MySQL physical profiles.
- Використати runtime-lifetime pinned control connection + exclusive vendor advisory gate для full/readonly/migrator lifecycle exclusion та transactional singleton control-row lock для journal-head/write serialization; V1 дозволяє один active runtime на storage. Clean close спочатку drain-ить, explicit release/verify-ить gate, і лише потім reset/return; premature reset є fatal gate loss.
- Зберігати metadata, payload actions/chunks і рівно один journal row в одній transaction; `operation_id` + fingerprint є durable idempotency/reconciliation authority.
- Після ambiguous commit не retry-ити blind: matching row = committed; same-lineage authoritative absence = not committed; changed-lineage absence = unsettled без exact history-preservation certificate; mismatch = integrity; unavailable/unknown primary = unsettled.
- Вимагати externally fenced single writable primary і verified durability-lineage identity; fencing саме по собі не доводить commit-history continuity. Time lease, multi-primary і read-replica reconciliation не є baseline authority.
- Виконувати migration offline під тим самим runtime-lifetime gate; розділити PostgreSQL transactional steps і MySQL forward-only ledger навколо implicit-commit atomic DDL.
- Спочатку довести shared indeterminate conformance foundation, потім окремі PostgreSQL і MySQL owner/implementation/certificate tasks; dependencies обираються лише у vendor gates.

## Наслідки

Semantic гарантії не послаблюються й network mechanics не витікають у Core/API, але persistent outage може залишити operation unsettled і призупинити runtime. Vendor profiles, migration executors, pools і topology certificates не можуть бути одним implementation. Baseline лишається single-writer-per-storage і не обіцяє HA data-loss properties без окремого certificate.

## Відхилені альтернативи

- Один lowest-common-denominator SQL driver — приховує суттєві isolation/DDL/session differences.
- Blind retry після timeout — може дублювати committed mutation.
- Time-based DB lease без fencing — допускає delayed/old-primary writer.
- Advisory lock без transactional control row — не дає незалежної exact journal-head serialization.
- Vendor implementations без shared conformance — дублюють і розходять semantic protocol.
