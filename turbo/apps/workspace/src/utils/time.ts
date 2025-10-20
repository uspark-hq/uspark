/**
 * Formats a timestamp as a relative time string (e.g., "2h ago", "3d ago")
 * This is a pure function with no side effects.
 *
 * @param timestamp - The timestamp to format (Date object or ISO string)
 * @returns A human-readable relative time string
 */
export function getRelativeTime(timestamp: string | Date): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) {
    return 'just now'
  }
  if (diffMins < 60) {
    return `${String(diffMins)}m ago`
  }
  if (diffHours < 24) {
    return `${String(diffHours)}h ago`
  }
  if (diffDays < 7) {
    return `${String(diffDays)}d ago`
  }
  return past.toLocaleDateString()
}
