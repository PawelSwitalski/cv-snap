---
intent: 001-one-click-tailored-cv
created: 2026-10-25T11:00:00Z
completed: 2026-10-25T12:30:00Z
status: complete
---

# Inception Log: 001-one-click-tailored-cv

## Overview

**Intent**: One-click generation of a CV tailored to the open job ad, using only facts from a user-reviewed CV profile, validated against hallucination.
**Type**: green-field
**Created**: 2026-10-25T11:00:00Z

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ approved | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md + units/*/unit-brief.md |
| Stories | ✅ | units/*/stories/*.md (32) |
| Bolt Plan | ✅ | memory-bank/bolts/001…012 |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 20 |
| Non-Functional Requirements | 7 categories (Performance, Scalability, Security, Reliability, Output Quality, Compatibility, Privacy) |
| Units | 5 |
| Stories | 32 |
| Bolts Planned | 12 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-cv-tailoring-core | 8 | 3 (002, 005, 006) | Must |
| 002-native-host | 6 | 3 (001, 003, 004) | Must |
| 003-job-ad-capture | 5 | 2 (007, 008) | Must |
| 004-cv-pdf-renderer | 4 | 1 (009) | Must |
| 005-tailored-cv-ui | 9 | 3 (010, 011, 012) | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-10-25T11:00:00Z | Single MVP intent covering install → profile → generate → download | Smallest end-to-end slice that delivers the core value | Yes |
| 2026-10-25T12:00:00Z | 5 units: core (DDD), native-host, job-ad-capture, pdf-renderer, ui | Project preset (single frontend unit) too coarse for host + domain core | Yes |
| 2026-10-25T12:00:00Z | Spike on headless Claude Code as the very first bolt | Highest-uncertainty dependency | Yes |
| 2026-10-25T11:00:00Z | Strict mode, extra formats/templates, site adapters, direct API, store release deferred | Keep MVP focused; architecture already allows adding them | Yes |

## Scope Changes

| Date | Change | Reason | Impact |
|------|--------|--------|--------|
| 2026-10-25T11:45:00Z | Output language: any language (not only PL/EN) | Author feedback at Checkpoint 2 | FR-9, FR-12 updated |
| 2026-10-25T11:45:00Z | Added FR-20 model selection (default Sonnet 5.5) | Author feedback at Checkpoint 2 | +1 FR, settings story |
| 2026-10-25T11:45:00Z | Job-ad detection via JSON-LD + URL patterns + keywords | Author feedback at Checkpoint 2 | FR-7 updated |

## Ready for Construction

**Checklist**:
- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction Phase
2. Start with bolt `001-native-host` (headless Claude Code spike)
3. Execute: `/specsmd-construction-agent --unit="002-native-host" --bolt-id="001-native-host"`
4. Project author prepares the regression fixture set before bolt `006-cv-tailoring-core`

## Dependencies

001 → 002 → (003 → 004 → 005 → 006) ∥ (007 → 008) ∥ (009); 010 after 004 + 005; 011 after 006, 008, 009, 010; 012 after 011.
