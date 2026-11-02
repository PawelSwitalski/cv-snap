---
intent: 003-complete-cv-content
phase: inception
status: units-decomposed
updated: 2026-11-02T18:45:00Z
---

# Complete CV Content - Unit Decomposition

## Units Overview

Two units, split by where the work lands: the extension's CV model and two-page fit (no host
change), and the other-sections feature that needs the plan schema, prompt and validator in
`shared/` as well.

### Unit 1: 001-complete-cv-model

**Description**: The CV model always prints every education entry and every profile skill
(plan-selected first); the two-page fit never drops education entries and drops non-selected
skills last. Extension only.

**Assigned Requirements**: FR-1, FR-2, FR-5

**Stories**: 001-education-always-printed, 002-all-skills-printed, 003-live-regression-education

**Dependencies**: Depends on None · Depended by 002-other-sections (drop order)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: S

### Unit 2: 002-other-sections

**Description**: The plan may select relevant other sections (courses, volunteering, …); they are
validated, printed with their title and lines, and dropped first to fit two pages.

**Assigned Requirements**: FR-3, FR-4

**Stories**: 001-plan-selects-other-sections, 002-other-sections-in-cv

**Dependencies**: Depends on 001-complete-cv-model (drop order) · Depended by Operations (0.1.1)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

## Requirement-to-Unit Mapping

- **FR-1**: Education is always printed → `001-complete-cv-model`
- **FR-2**: All skills are printed, relevant ones first → `001-complete-cv-model`
- **FR-3**: Other sections can be printed → `002-other-sections`
- **FR-4**: Fact validation still holds → `002-other-sections`
- **FR-5**: Regression coverage → `001-complete-cv-model` (other-section tests are part of the
  FR-3 / FR-4 stories)
