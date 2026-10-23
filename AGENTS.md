# AGENTS.md

## PURPOSE

This file is the project's AI agent entry point.

Before creating, changing, debugging, or planning anything, inspect the project and understand its actual structure, documentation, source code, and current state.

---

## PROJECT STRUCTURE

Keep documentation and memory outside application source code.

Use the appropriate application folder for actual source code, for example:

```text
project/
├── agents.md
├── docs/
│   ├── product.md
│   ├── architect.md
│   └── ui/
│       └── ux.md
├── memory/
└── application/
```

Do not create unnecessary application folders. Choose the structure based on the actual project.

---

## START HERE

1. Inspect the existing project structure.
    
2. Read the relevant files in `docs/`.
    
3. Read relevant existing `.md` documentation, including any of:
    
    - `PRD.md`
        
    - `PRODUCT.md`
        
    - `REQUIREMENTS.md`
        
    - `REQUIREMENT.md`
        
    - `ARCHITECTURE.md`
        
    - `TRD.md`
        
    - `UI_UX.md`
        
    - `UI_STRUCT.md`
        
    - `UI_STRUCTURE.md`
        
4. Read `memory/MEMORY_STRUCTURE.md` if `memory/` exists.
    
5. Read only the memory relevant to the current task.
    
6. Inspect actual source code before making major changes.
    
7. Never assume a file, feature, architecture, or requirement exists.
    

If documentation contains implementation instructions, follow them unless the user gives newer instructions.

---

## DOCUMENTATION

### `docs/product.md`

Product definition:

- Problem
    
- Purpose
    
- Target users
    
- Goals
    
- Features
    
- User flows
    
- Requirements
    
- MVP scope
    
- Future scope
    
- Constraints
    
- Acceptance criteria
    

### `docs/architect.md`

Technical implementation:

- Tech stack
    
- Project structure
    
- Architecture
    
- Modules/components
    
- Data flow
    
- Database/models
    
- APIs
    
- Authentication
    
- State management
    
- Storage
    
- External services
    
- Security
    
- Dependencies
    
- Build/deployment
    
- Technical decisions
    
- Development progress
    
- Completed tasks
    
- In-progress tasks
    
- Planned/future technical tasks
    
- Known limitations/technical debt
    
- Current version/status
    

Keep implementation status based on the **actual codebase**, not assumptions.

### `docs/ui/ux.md`

UI/UX definition:

- Design direction
    
- Colors
    
- Typography
    
- Spacing
    
- Components
    
- Navigation
    
- Screens
    
- Layouts
    
- Interactions
    
- Loading/empty/error states
    
- Responsive behavior
    
- Accessibility
    
- Animations
    
- Platform-specific UI behavior
    

---

## MEMORY

If `memory/` exists:

1. Read `memory/MEMORY_STRUCTURE.md` first.
    
2. Use `memory/INDEX.md` to locate relevant memory.
    
3. Read only the memory required for the current task.
    
4. Process `memory/_inbox/memory.md` when applicable.
    
5. Do not create random memory categories.
    
6. Let the actual project determine whether a new memory category is necessary.
    

`MEMORY_STRUCTURE.md` is the source of truth for memory rules.

---

## UPDATE

When the user says **"update"**:

1. Inspect what actually changed.
    
2. Update the relevant documentation.
    
3. Update relevant memory.
    
4. Update `memory/INDEX.md` when needed.
    
5. Process temporary memory.
    
6. Verify that documentation matches the actual codebase.
    

Do not record every tiny code change.

---

## MODES

### PLAN

Read → understand → plan.

Do not modify the project unnecessarily.

### PRODUCTION

Read → plan → build → test → verify → update docs/memory.

### DEBUG

Reproduce → investigate → fix → test → verify → update docs/memory.

---

## RULES

- Read before changing.
    
- Inspect before creating.
    
- No invented requirements.
    
- No invented files.
    
- No invented architecture.
    
- No duplicate features, systems, or files.
    
- Do not overwrite existing work without understanding it.
    
- Follow the latest user instruction.
    
- Keep source code inside the designated application folder.
    
- Keep `docs/` and `memory/` outside application source.
    
- Keep documentation synchronized with the real project.
    
- Keep completed, in-progress, and planned work clearly separated.
    
- When uncertain, inspect the project instead of guessing.