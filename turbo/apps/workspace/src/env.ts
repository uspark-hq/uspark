export const IN_VITEST =
  typeof window !== 'undefined' && Boolean(window.__vitest_index__)
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const IN_NODE = typeof process !== 'undefined' && process.versions?.node

export const DEBUG: readonly string[] = IN_NODE
  ? (process.env.DEBUG?.split(',') ?? [])
  : []
