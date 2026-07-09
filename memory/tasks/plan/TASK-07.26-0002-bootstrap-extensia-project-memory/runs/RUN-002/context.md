# Пакет контексту: RUN-002

## Обов'язкове читання

- `memory/agent-start.md`
- `memory/state.md`
- `memory/memory-rules.md`
- `memory/agents/rules.md`
- `memory/tasks/plan/progress.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/task.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/runs/RUN-002/requirements.md`
- `memory/tasks/plan/TASK-07.26-0002-bootstrap-extensia-project-memory/runs/RUN-002/context.md`

## Source files до relocation

| Файл | Bytes | SHA-256 |
|---|---:|---|
| `v2/domain-model-v2.md` | 18603 | `A51E4F10F74E700F8AC1F13101C7762E61BF0ADA0153324C5E53A5217CB966DB` |
| `v2/extension-and-api-model-v2-ioc.md` | 92855 | `2BBDE1AFEC5C1FBBCCDE3798010E9D00B690AE89ADE7C3F97D0A19D584214671` |
| `v2/runtime-architecture-v2-ioc.md` | 67190 | `F4904C18D3BBAFA37B7ECC63715F5CB4CD385AE50C26F5C95D2BD61DA8237B84` |

## Obsolete files до deletion

| Файл | Bytes | SHA-256 |
|---|---:|---|
| `v2/extension-and-api-model.md` | 51430 | `87F423ABD1A64A936F8869AA75431E5DCB7367B80CDDB2B509F5BC7616C58CA6` |
| `v2/runtime-architecture.md` | 55090 | `7CC51E9FEF031C21D8A225A8C0C1800ADA92F9057A124CDAA290E57A0BC1FC3B` |

## Релевантний контекст

RUN-001 розгорнув structured memory, але detailed source references лишилися в root `v2/`, поруч із двома obsolete documents. RUN-002 усуває parallel source location: актуальні documents стають reference layer усередині Project Memory, obsolete documents видаляються.

Користувач також явно приймає всі product requirements. Це змінює status requirements, але не скасовує source-level позначку draft і не робить conceptual examples автоматично stabilized API signatures.

## Відомі ризики

- Relocation може залишити stale canonical paths або broken wiki links.
- Bulk status update може випадково змінити status text поза requirement rows.
- Accepted requirements можна помилково інтерпретувати як закриття всіх domain/technical open questions.
- Historical RUN-001 artifacts містять старі root paths; їх не можна переписувати так, ніби relocation відбувся раніше.

## Правила безпеки

- Для relocation використовувати exact literal source/target paths і перевірити, що всі paths залишаються всередині workspace.
- Не виконувати recursive move/delete.
- Після relocation повторно обчислити SHA-256.
- Obsolete files видаляти тільки за exact filenames, явно заданими користувачем.
