# Review: fix: use consistent sha256 content hash in web interface

## Commit: e5ab12a

## Summary

This commit fixes a critical bug in the web interface where incorrect blob URL construction caused 404 errors when loading file contents. The fix ensures consistency between CLI and web interface blob URL formats and addresses React hook dependency issues.

## Findings

### Good Practices

1. **Critical Bug Fix**: Addresses a complete functionality failure (404 errors) in the web interface, restoring file viewing capabilities.

2. **Consistency Across Components**: Aligns web interface blob URL format with CLI implementation, reducing discrepancies between different parts of the system.

3. **Proper Hash Implementation**: Uses SHA-256 hashing consistently with the CLI approach, ensuring content integrity and predictable URL generation.

4. **React Hook Compliance**: Fixes the ESLint dependency array issue by including `projectId` in the `useCallback` dependencies.

5. **Clean Refactoring**: Removes temporary debugging scripts used during investigation, keeping the codebase clean.

6. **Comprehensive Testing**: The test plan shows verification of functionality across multiple aspects (web interface, consistency, linting, local development).

### Issues Found

1. **Hash-based Path Logic**: The fix changes from timestamp-based paths (`${Date.now()}-${filePath}`) to hash-based paths (`${hash}`). While this improves consistency, it might create issues if multiple files have the same content, as they would overwrite each other.

2. **Blob URL Construction**: The URL construction logic is now duplicated between the file upload (`yjs-file-writer.ts`) and file loading (`page.tsx`) components. This could lead to maintenance issues if the URL format needs to change again.

3. **Missing Error Handling**: The blob URL construction and fetching doesn't include comprehensive error handling for cases where the blob might not exist or be accessible.

4. **React Hook Dependencies**: While the dependency array is fixed, the `useCallback` might be over-optimized. The callback depends on several pieces of state that change frequently, potentially reducing the optimization benefits.

5. **Content Hash Collision**: Using only the content hash as the blob path means files with identical content will share the same blob URL, which might not always be desired behavior.

## Recommendations

1. **Content Deduplication Strategy**: Document whether content deduplication (same hash = same blob) is intentional. If not, consider including file path or timestamp in the blob key to ensure uniqueness.

2. **Centralize URL Logic**: Extract blob URL construction into a shared utility function to avoid duplication between upload and download logic:
   ```typescript
   export function getBlobUrl(storeId: string, projectId: string, hash: string): string {
     return `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${hash}`;
   }
   ```

3. **Add Error Handling**: Implement proper error handling for blob fetching failures:
   - Network errors
   - Blob not found (404)
   - Invalid blob content
   - Permission issues

4. **Consider File Metadata**: Include file metadata (original filename, upload timestamp) in the blob info to support better file management and debugging.

5. **Performance Monitoring**: Monitor the impact of the new hash-based approach on:
   - Storage usage (deduplication benefits)
   - File loading performance
   - Cache hit rates

6. **Integration Testing**: Add integration tests to verify the end-to-end flow from file upload to file loading to prevent similar URL format mismatches in the future.