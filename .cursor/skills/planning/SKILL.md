---
name: planning
description: Plan implementation steps before any coding starts; avoid bad architecture decisions.
trigger:
  - when user asks to implement or modify features
  - when repository-wide design/architecture decisions are needed
priority: high
---

# SKILL: Implementation Planner

## ROLE

Never jump directly into coding.

Always design execution steps first.

---

## PLANNING PROCESS

Before implementation:

1. Understand request
2. Identify affected layers:
   - frontend
   - backend (Spring Boot)
   - shared contracts

3. Break task into steps
4. Detect risks
5. Choose safest implementation path

---

## PLAN FORMAT

### Goal
What needs to be achieved.

### Affected Areas
Which parts of system change.

### Steps
Ordered implementation steps.

### Risks
Possible problems.

### Final Approach
Chosen solution.

---

## RULES

- Prefer minimal change strategy
- Avoid large refactors unless required
- Reuse existing patterns

---

## AFTER PLANNING

Only after plan is clear:
→ start coding.

Planning reduces hallucination and bad architecture decisions.