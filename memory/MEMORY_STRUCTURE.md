# DYNAMIC MEMORY STRUCTURE

## Default Structure, Not a Fixed Limitation

The memory structure provided in this file is the **default structure**, not an unchangeable limitation.

The agent must not create memory folders, categories, or notes randomly.

Before creating a new memory structure, the agent must first understand the project.

The agent should consider:

1. The project's `docs/` files.
    
2. `PRODUCT.md`, `PRD.md`, or equivalent product documentation if present.
    
3. `ARCHITECTURE.md`, `TRD.md`, or equivalent technical documentation if present.
    
4. `UI_UX.md` or equivalent design documentation if present.
    
5. Other relevant `.md` files in the project.
    
6. The user's explicit prompts and instructions.
    
7. The current source code and project structure.
    
8. Existing project memory.
    
9. Existing relationships between memory notes.
    

Only after understanding these should the agent decide whether an additional memory category is necessary.

---

## Create New Categories Only When Necessary

If the default memory categories are sufficient:

**Do not create additional categories.**

If the project contains a genuinely important type of knowledge that does not fit naturally into the existing structure, the agent may create a new category.

Examples could include:

```text
research/
testing/
security/
integrations/
deployment/
design/
performance/
```

However, these are only examples.

The agent must **not create them automatically**.

The category must be justified by the actual project.

---

## Project-Driven Structure

The memory structure should emerge from the project itself.

The agent should follow this principle:

```text
Project
   ↓
Read documentation
   ↓
Read user's requirements/prompts
   ↓
Understand architecture and features
   ↓
Inspect existing memory
   ↓
Identify recurring knowledge types
   ↓
Determine whether the default structure is sufficient
   ↓
If sufficient → use existing structure
   ↓
If insufficient → create a necessary category
```

The agent should never create a category simply because it "might be useful someday."

---

## Before Creating a New Folder

Before creating a new memory folder, the agent must ask:

```text
Does this information belong in an existing category?
```

If yes:

**Use the existing category.**

If no, ask:

```text
Is this type of information important enough to be
maintained as long-term project memory?
```

If no:

**Do not create a memory category.**

If yes, ask:

```text
Will this type of information occur repeatedly or
represent a meaningful area of project knowledge?
```

If yes:

**A new category may be justified.**

If it is only a one-time piece of information:

**Prefer an existing note or an appropriate general category instead of creating a new folder.**

---

## Documentation and User Prompts Have Priority

The agent must use the actual project requirements to determine memory organization.

For example, if the project's PRD contains a large security system and the project repeatedly requires security-specific decisions, vulnerabilities, configurations, and lessons, the agent may determine that a dedicated:

```text
memory/security/
```

category is appropriate.

But if the project has no meaningful security-specific knowledge, it should not create:

```text
memory/security/
```

just because security is a common software-development topic.

The same principle applies to every possible category.

---

## Do Not Over-Structure

Avoid creating structures such as:

```text
memory/
├── features/
├── issues/
├── decisions/
├── api/
├── architecture/
├── security/
├── testing/
├── performance/
├── deployment/
├── database/
├── frontend/
├── backend/
├── mobile/
├── research/
├── users/
├── analytics/
├── integrations/
└── miscellaneous/
```

unless the actual project requires them.

A large number of empty or unnecessary categories makes the memory system harder to navigate and reduces the usefulness of the Obsidian graph.

Prefer:

```text
Small project
→ Small memory structure
```

and:

```text
Complex project
→ More detailed memory structure when justified
```

---

## Existing Structure Must Be Respected

Before creating a new category, inspect the existing memory structure.

If another developer or agent has already created a meaningful custom structure, do not replace it simply because it differs from the default structure in this file.

Understand the existing structure first.

Modify it only when there is a clear reason.

---

## Every Custom Category Must Have a Reason

When a new category is created, the agent should document why it exists.

For example:

```md
# Category Purpose

## Why This Category Exists

This project contains a large number of security-specific
decisions and recurring security investigations that do not
fit cleanly into the default memory categories.

Therefore, `security/` was created as a dedicated memory category.

## Based On

- Project requirements
- Architecture documentation
- Existing project implementation
- User requirements
```

The explanation may be placed in the category's `README.md` or another appropriate location.

---

## Memory Structure Can Evolve

The memory structure is allowed to evolve as the project evolves.

For example:

```text
Project starts
    ↓
Default structure is sufficient
    ↓
Project becomes more complex
    ↓
A new recurring knowledge type appears
    ↓
Agent analyzes project requirements
    ↓
New category becomes justified
    ↓
Category is created
    ↓
INDEX.md is updated
```

Similarly, if a category becomes unnecessary, the agent may archive or reorganize it when appropriate.

Do not preserve unnecessary complexity forever.

---

## Never Create Memory Based on Guessing

The agent must not create a memory category based on:

- assumptions about what the project might need
    
- generic software-development practices
    
- personal preference
    
- arbitrary organization
    
- imagined future features
    
- technologies that are not actually used
    
- features that are not documented or requested
    

Memory organization must be based on **evidence from the project**.

---

## Core Rule

The most important rule is:

> **Understand the project first. Structure the memory according to the project second.**

The default structure provides a starting point.

The project itself determines whether that structure should remain unchanged or be extended.

```text
DO NOT:
Structure → Force project into structure

DO:
Project → Understand project → Design appropriate memory structure
```

The goal is not to create the largest or most sophisticated memory system.

The goal is to create the **most useful memory system for the actual project**.