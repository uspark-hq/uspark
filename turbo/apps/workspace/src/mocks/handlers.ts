export const handlers = []

export const onUnhandledRequest = (req: { url: string }) => {
  if (
    req.url.includes('/@fs/') ||
    req.url.includes('/__vitest_test__/__test__/')
  ) {
    return
  }

  throw new Error(`Unhandled request: ${req.url}`)
}
