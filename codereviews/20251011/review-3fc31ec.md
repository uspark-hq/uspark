# Code Review: 3fc31ec

## Summary
Improves CLI authentication polling by skipping the initial delay before the first token poll attempt. This reduces average authentication time from ~10s to ~5s and improves E2E test reliability.

## Timer/Delay Analysis
**Good improvement**:
- **Problem**: 5-second delay before first poll caused slow auth and test timeouts
- **Solution**: Skip delay on first iteration only using `isFirstPoll` flag
- **Result**: Faster user experience and more reliable tests

**Not a bad smell**: This is appropriate use of delays:
- Polling is necessary for the OAuth device flow pattern
- Only removes unnecessary initial delay
- Maintains proper polling interval for subsequent attempts
- No fake timers used in tests

## Error Handling
**Good**: No try/catch blocks added. The delay logic is simple and fail-fast.

## Bad Smells Detected
None. This is a legitimate optimization that:
- Removes unnecessary delay without compromising functionality
- Improves both user experience and test reliability
- Doesn't introduce artificial delays or fake timers
- Follows the OAuth device flow standard pattern

## Recommendations
None. This is a clean performance improvement.
