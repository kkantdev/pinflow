# Memory Inbox

Temporary memory. Entries land here first, then get either **promoted** into a
permanent note in `memory/` or documentation in `docs/`, or **discarded**.

Processing rules live in `MEMORY_STRUCTURE.md`. Processed entries are kept
briefly as an audit trail, then trimmed.

---

## Unprocessed

_None._

---

## Processed

### 2026-09-17 — Product renamed Pinova → PinFlow

**What happened:** The product name was replaced everywhere: 134 occurrences
across 16 files, in one atomic pass covering user-facing branding, internal
identifiers (`Pinova*` → `PinFlow*`, `PINOVA_*` → `PINFLOW_*`), the npm package
name (`pinova` → `pinflow`), comments and docs.

**Promoted to:** `memory/naming-conventions.md` (names, globals, message types,
do-not-rename list, rename history and the verification method).

### 2026-09-17 — Internal engine named "Nova"

**What happened:** The gesture-attributed PiP engine (`detect.js` + `pip.js`) was
given the internal name **Nova**, recorded in `application/README.md` §7, `docs/architect.md`
and the four module header comments that reference it. Explicitly not
user-facing.

**Promoted to:** `memory/naming-conventions.md`, `docs/architect.md` (§ Modules),
`docs/ui/ux.md` has no Nova references by design.

### 2026-09-17 — Repository restructured per AGENTS.md

**What happened:** The loadable extension moved into `application/`
(`manifest.json`, `src/`, `assets/`). `docs/product.md`, `docs/architect.md` and
`docs/ui/ux.md` were created. `memory/` was established from the existing
Obsidian scaffold (`MEMORY_STRUCTURE.md.md` → `MEMORY_STRUCTURE.md`), and
`docs/Agents.md` moved to the repository root as `AGENTS.md`. Four relative paths
were updated in `tests/` and `tools/`; `manifest.json` needed no change because
its paths are extension-root-relative.

**Promoted to:** `docs/architect.md` (§ Project structure, § Technical decisions,
§ Development progress), `application/README.md` (install + structure sections),
`memory/INDEX.md`.

---

## Notes on process

* Entries record **decisions and durable facts**, not individual code edits.
* Anything that changes how the product behaves belongs in `docs/` instead.
* Verify claims against `application/` before promoting — never assume an API,
  file or behaviour exists.