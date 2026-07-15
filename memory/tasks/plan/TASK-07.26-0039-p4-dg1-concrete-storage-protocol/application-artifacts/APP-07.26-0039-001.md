# APP-07.26-0039-001: P4-DG1 canonical application

Status: published
Published: 2026-07-12
Related Task: [P4-DG1 / TASK-07.26-0039](../task.md)
Related Run: [RUN-003](../RUN-003/index.md)
Applied Fixations: [FIX-001](../FIX-001.md), [FIX-002](../FIX-002.md)
Post-application Audit: `PASS`, open P0-P3 none

## Published decisions

- ADR-0010 accepts bounded `embedded-transactional/local-sqlite-v1` as first/default concrete profile `0.1.0` without implementation/support claim.
- Canonical driver families: `filesystem-native`, `embedded-transactional`, `client-server-transactional`.
- Shared semantic contract and family/profile-local physical mechanisms remain separated.
- TASK-0041/TASK-0042 are backlog/prepared research/design gates; P4-WP1 was not created or activated.

## SHA-256 manifest

```text
d0433eb6d455d2a7567f5886df765ccbd32c28d9e7b272b2efc95d18a9453516  memory/technical/decisions/ADR-0010-local-sqlite-storage-protocol.md
5af0ef18d7842829d02f9955920dd7382af7c4e170eeae86cdf8831965e0c242  memory/technical/write-journal-recovery-contract.md
01c45e20dba4cfb518369c9549a87f6026c41f47da9a3593627260e7c865ebba  memory/technical/architecture.md
a73c2c6312e33c262b3937fab49d32bdbf8427857f0cc97902bced860cb7d7a3  memory/technical/rules.md
84c5fb939bbefb7a19bcfb49afbbeae91757b8a2998ce1c877a5f39bc7cb1b35  memory/technical/open-questions.md
164701043722be269490692aa60cc84401c2ef9eb5a0af764ca94def1b79ecd6  memory/technical/index.md
2cbaa58adbdc538bc02991ce6e4eeb3aa083df992a7d30166cb97004c227f47e  memory/technical/decisions/index.md
672945dd57338cfb3b69129d5f9aa8e8d2db525c3b182c5644a9a9ecf969298e  memory/product/roadmap.md
0f869e3e00c606bcba077dcfa0ca813567e61f12ba81831d6604cb79d900e58d  memory/domain/current/implementation-state.md
4a0d2d3c8dd4b43cb3bfd601004df98f35658bf3b4caac0b6f0c5f454d23b3df  memory/state.md
```

Hashes capture canonical targets immediately after final post-audit remediation and before lifecycle-only closure updates.
