# Code Review: 6ccacf8

## Summary
Adds development environment configuration support for E2B sandbox testing. Allows developers to use fixed production project/session/turn IDs and tokens when testing locally.

## Error Handling
**Good**: Explicit error messages when dev environment variables are missing in development mode. Fail-fast pattern is followed.

## Hardcoded URLs and Configuration
**Potential violation of bad-smell.md #11**:

The code checks `process.env.NODE_ENV` directly instead of using the centralized `env()` function:

```typescript
const isDevelopment = process.env.NODE_ENV === "development";
```

**Why this matters**: All environment configuration should go through the `env()` function for consistency and validation.

## Bad Smells Detected

1. **Direct `process.env` access (bad-smell.md #11)**:
   - Multiple instances of `process.env.NODE_ENV === "development"`
   - Should use centralized env() function instead
   - Creates inconsistency with other environment variable access

2. **Validation removed for initialization**:
   The code removed the check for production/preview environments:
   ```typescript
   // Before: Skipped in non-production
   if (!isProductionDeployment || isDevelopment) {
     return; // skip
   }

   // After: Always runs uspark pull (even in dev)
   ```
   This changes behavior - now runs pull in all environments. This might be intentional but should be documented.

## Recommendations

1. **Add NODE_ENV to env schema**:
```typescript
// In env.ts
const schema = z.object({
  server: z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    // ... other fields
  })
});
```

2. **Use env() function consistently**:
```typescript
const isDevelopment = env().NODE_ENV === "development";
```

3. **Document behavior change**: The removal of the production check means `uspark pull` now runs in all environments. Add a comment explaining why this is intentional.

4. **Consider fallback pattern**: The code throws errors when dev vars are missing in dev mode. This is good fail-fast behavior, but the commit message says these are "optional" - clarify this contradiction.
