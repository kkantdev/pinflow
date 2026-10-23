# Memory Index

Project memory for **PinFlow**. `MEMORY_STRUCTURE.md` is the source of truth for
memory rules; this file is the map used to locate relevant memory.

Read only what the current task needs (`AGENTS.md` → MEMORY).

---

## Memory notes

| Note | Covers | Read it when |
| --- | --- | --- |
| [`naming-conventions.md`](./naming-conventions.md) | Product name PinFlow, internal engine name Nova, globals (`PinFlowLogic` / `PinFlowDetect` / `PinFlowApi`), message types (`PINFLOW_*`), the do-not-rename list, rename history and verification method | Renaming anything, adding a message type, onboarding to the codebase, or touching branding |
| [`_inbox/memory.md`](./_inbox/memory.md) | Temporary/unprocessed memory | The memory inbox has unprocessed entries (see `MEMORY_STRUCTURE.md`) |

## Categories

Only one category exists so far — the root. No subcategories have been created,
because the project has not yet produced a recurring knowledge type that the root
cannot hold. Per `MEMORY_STRUCTURE.md`, categories are **not** created
speculatively.

Potential future categories, **only if the project actually demands them**:
`testing/`, `security/`, `release/`.

---

## Pointers to project documentation

Memory is not the place for product or architecture truth — those live in `docs/`.
Memory references them rather than duplicating them.

| Question | Read |
| --- | --- |
| What is this product, for whom, and why? | `docs/product.md` (full requirements: `docs/PRD.md`) |
| How is it built, and what is the current status? | `docs/architect.md` |
| What does the UI look like and how does it behave? | `docs/ui/ux.md` |
| How do I install, use and test it? | `application/README.md` |
| What are the agent/working rules? | `AGENTS.md` |

---

## Maintenance

* Update a note when a decision changes, **not** for every code edit (`AGENTS.md` → UPDATE).
* Keep `_inbox/memory.md` processed and empty; promote durable facts into a note here.
* When a note is added, linked or archived, update this index.
* Keep memory synchronized with the real codebase — verify against `application/`
  before writing anything down.