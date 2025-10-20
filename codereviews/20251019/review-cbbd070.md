# Code Review: fix(api): correct interrupt route to use running status

**Commit**: cbbd07078faae9fe76f30952e4df59426311d38b
**Date**: 2025-10-19

## Summary
Fixed bug where interrupt requests didn't change turn status because route was searching for deprecated `in_progress` status instead of `running`. Also changed target status to `interrupted` for semantic accuracy.

## Code Smells Found

None detected. In fact, this commit fixes a code smell!

## Positive Observations

1. **Test Improvement**: Refactored tests to use API instead of direct DB inserts (follows spec/bad-smell.md section 12)
2. **Bug Fix**: Updated WHERE clause from `in_progress` to `running`
3. **Semantic Accuracy**: Changed target status from `failed` to `interrupted`
4. **Behavioral Testing**: Tests now reflect actual user flow instead of database mechanics
5. **Alignment with Migration**: Matches migration 0015 changes

## Overall Assessment
**Pass** - Excellent bug fix that also improves test quality by moving away from direct DB operations.
