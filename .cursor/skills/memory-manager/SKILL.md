---
name: memory-manager
description: Keep long-term project knowledge and key decisions across sessions.
trigger:
  - when we need to record important architectural or process decisions
  - when a change affects future development responsibilities
priority: medium
---

# SKILL: Project Memory Manager

## ROLE

Maintain long-term knowledge about this project.

Track decisions that affect future development.

---

## WHAT TO STORE

Store ONLY important decisions:

- architecture changes
- API contract definitions
- folder structure decisions
- auth flow design
- proxy responsibilities
- major refactors

DO NOT store:
- temporary tasks
- debugging steps
- small fixes

---

## MEMORY FILE

Maintain:

PROJECT_MEMORY.md

---

## MEMORY FORMAT

Each entry:

## [DATE]

### Decision
What was decided.

### Reason
Why decision was made.

### Impact
How it affects future development.

---

## WHEN TO UPDATE MEMORY

Update when:

- new architectural pattern introduced
- responsibilities moved between FE and BE
- new system boundary created
- major dependency added

---

## BEHAVIOR

If change impacts future developers:
→ Update memory automatically.

Memory ensures consistency across sessions.