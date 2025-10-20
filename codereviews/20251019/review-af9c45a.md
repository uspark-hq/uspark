# Code Review: fix(turns): remove obsolete pending and in_progress statuses

**Commit**: af9c45a7027d2fd99884a3b2c18553db27ccc326
**Date**: 2025-10-19

## Summary
Removed unused turn statuses (`pending`, `in_progress`) that were migrated away in migration 0015 but still existed in schema defaults and code. Fixed bug where initial scan executor created turns with `pending` status but executor checked for `running`.

## Code Smells Found

None detected.

## Positive Observations

1. **Bug Fix**: Initial scans now execute correctly
2. **Schema Alignment**: Default status changed from `pending` to `running`
3. **Removed `startedAt`**: Field already dropped in migration, now removed from schema
4. **Simplified State Machine**: Single state (`running`) → terminal states
5. **Test Updates**: All tests updated to use `running` status
6. **No Intermediate States**: Cleaner state model

## Overall Assessment
**Pass** - Important bug fix that aligns schema with migration and simplifies state machine.
