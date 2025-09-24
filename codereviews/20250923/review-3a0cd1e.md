# Review: fix: handle http redirects in cli fetch operations

## Commit: 3a0cd1e

## Summary
This commit adds proper HTTP redirect handling for CLI fetch operations by implementing a `fetchWithAuth` helper method. The solution preserves Authorization headers when following redirects, fixing issues where CLI operations would fail with 404 errors when using URLs that redirect (e.g., www.uspark.ai → uspark.ai).

## Findings

### Good Practices
- **Clear problem identification**: Well-documented issue with specific example (www subdomain redirect)
- **Focused solution**: Addresses the exact problem without over-engineering
- **Comprehensive replacement**: All fetch calls consistently updated to use the new helper
- **Proper HTTP handling**: Correctly handles all redirect status codes (301/302/307/308)
- **Preserves existing functionality**: All existing CLI behavior maintained
- **Good method naming**: `fetchWithAuth` clearly indicates its purpose

### Issues Found

#### 1. **Potential Over-Engineering** 🟡
The solution manually handles redirects for all fetch calls, even when redirects aren't expected. This adds complexity to every API call when the issue only occurs with specific URL configurations.

**Alternative approach**: Could detect redirect URLs at CLI initialization and normalize them once, rather than handling redirects on every request.

#### 2. **No Error Handling for Malformed Location Headers** 🟡
```typescript
const location = response.headers.get("location");
if (location) {
  return fetch(location, ...);
}
```
No validation that the location header contains a valid URL. Could fail silently if location header is malformed.

#### 3. **Infinite Redirect Potential** 🟠
The current implementation doesn't limit redirect depth, which could cause infinite loops if servers return redirect chains or circular redirects.

#### 4. **Inconsistent with Fetch API Standards** 🟡
The solution bypasses the standard fetch redirect handling, which is well-tested and handles edge cases. This creates a custom implementation that needs to handle all the same edge cases.

## Recommendations

1. **Add redirect depth limiting**:
```typescript
private async fetchWithAuth(
  url: string,
  token: string,
  options: RequestInit = {},
  redirectCount = 0,
): Promise<Response> {
  if (redirectCount > 10) {
    throw new Error("Too many redirects");
  }
  // ... existing logic ...
  // When following redirect:
  return this.fetchWithAuth(location, token, options, redirectCount + 1);
}
```

2. **Validate location headers**:
```typescript
const location = response.headers.get("location");
if (location) {
  try {
    new URL(location); // Validate URL format
    return this.fetchWithAuth(location, token, options, redirectCount + 1);
  } catch {
    throw new Error(`Invalid redirect location: ${location}`);
  }
}
```

3. **Consider URL normalization approach**:
```typescript
// At CLI initialization, normalize the API URL
private normalizeApiUrl(apiUrl: string): string {
  // Handle common redirects like www -> non-www
  return apiUrl.replace(/^https:\/\/www\./, 'https://');
}
```

4. **Add comprehensive error handling**:
- Handle cases where location header is missing on redirect responses
- Provide meaningful error messages for redirect failures

**Overall Assessment**: ⚠️ **Acceptable with Concerns** - The solution works but introduces complexity and potential edge cases. Consider the simpler URL normalization approach for this specific use case.