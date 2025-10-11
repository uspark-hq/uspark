# Code Review: d70b308

## Summary
Refactors to use effective project ID consistently throughout sandbox metadata and environment variables, addressing CodeRabbit review feedback.

## Bad Smells Detected
None. This commit improves consistency by using the "effective" project ID (either dev or production) throughout the code instead of mixing both.

**Improvements**:
- Uses `effectiveProjectId` in sandbox metadata
- Uses `effectiveProjectId` in env vars
- Removes duplication

## Recommendations
This is a good cleanup commit that addresses the review feedback from 6ccacf8. The direct `process.env` access issue from the previous commit still remains though (see review-6ccacf8.md).
