import { command, computed, state, type Command } from 'ccstate'
import { match } from 'path-to-regexp'
import type { RoutePath } from '../types/route'
import { pathname, search } from './location'
import { detach, Reason } from './promise'
import { rootSignal$ } from './root-signal'
import { onDomEventFn, resetSignal } from './utils'

const reloadPathname$ = state(0)
export const pathname$ = computed((get) => {
  get(reloadPathname$)

  return pathname()
})

export const searchParams$ = computed((get) => {
  get(reloadPathname$)
  return new URLSearchParams(search())
})

export const updateSearchParams$ = command(
  ({ set }, searchParams: URLSearchParams) => {
    const str = searchParams.toString()
    window.history.pushState({}, '', `${pathname()}${str ? `?${str}` : ''}`)
    set(reloadPathname$, (x) => x + 1)
  },
)

export const pathParams$ = computed((get) => {
  const currentRoute = get(currentRoute$)
  if (!currentRoute) {
    return undefined
  }
  const matcher = match(currentRoute.path, { decode: decodeURIComponent })
  const currentPath = get(pathname$)
  const result = matcher(currentPath)
  return result ? result.params : undefined
})

interface Route {
  path: string
  setup: Command<Promise<void> | void, [AbortSignal]>
}

const inertnalRouteConfig$ = state<Route[] | undefined>(undefined)
const currentRoute$ = computed((get) => {
  const config = get(inertnalRouteConfig$)
  if (!config) {
    return null
  }

  const currentPath = get(pathname$)

  for (const route of config) {
    const matcher = match(route.path, { decode: decodeURIComponent })
    const result = matcher(currentPath)
    if (result) {
      return route
    }
  }

  return null
})

const resetRouteSignal$ = resetSignal()
const loadRoute$ = command(async ({ get, set }, signal?: AbortSignal) => {
  const routeSignal = set(
    resetRouteSignal$,
    ...([signal].filter(Boolean) as AbortSignal[]),
  )

  const currentRoute = get(currentRoute$)
  if (!currentRoute) {
    throw new Error('No route matches, pathname: ' + get(pathname$))
  }

  await set(currentRoute.setup, routeSignal)
})

const navigateToDefaultWhenInvalid$ = command(({ get, set }) => {
  const config = get(inertnalRouteConfig$)

  if (!config) {
    return
  }

  if (!get(currentRoute$)) {
    set(reloadPathname$, (x) => x + 1)
    window.history.pushState({}, '', '/')
  }
})

export const initRoutes$ = command(
  async ({ set }, config: readonly Route[], signal: AbortSignal) => {
    set(inertnalRouteConfig$, config)
    set(navigateToDefaultWhenInvalid$)

    window.addEventListener(
      'popstate',
      onDomEventFn(async () => {
        set(reloadPathname$, (x) => x + 1)
        set(navigateToDefaultWhenInvalid$)
        await set(loadRoute$, signal)
      }),
      { signal },
    )

    await set(loadRoute$, signal)
  },
)

interface NavigateOptions {
  searchParams?: URLSearchParams
}

export const navigate$ = command(
  async (
    { set },
    pathname: string,
    options: NavigateOptions,
    signal: AbortSignal,
  ) => {
    const searchParams = options.searchParams
      ? `?${options.searchParams.toString()}`
      : ''
    window.history.pushState({}, '', `${pathname}${searchParams}`)
    set(reloadPathname$, (x) => x + 1)
    await set(loadRoute$, signal)
  },
)

export const navigateInReact$ = command(
  (
    { set, get },
    pathname: Parameters<typeof generateRouterPath>[0],
    options?: {
      pathParams?: Parameters<typeof generateRouterPath>[1]
      searchParams?: URLSearchParams
    },
  ) => {
    // eslint-disable-next-line moxt/no-get-signal
    const signal = get(rootSignal$)

    detach(
      set(
        navigate$,
        generateRouterPath(pathname, options?.pathParams),
        options ?? {},
        signal,
      ),
      Reason.DomCallback,
    )
  },
)

// extract params from path
// /projects/:id => { id: string }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ExtractParams<T extends string> =
  T extends `/${infer _Start}/:${infer Param}`
    ? Record<Param, string>
    : undefined

export const generateRouterPath = <T extends RoutePath>(
  path: T,
  pathParams?: ExtractParams<T>,
): string => {
  if (!pathParams || Object.keys(pathParams).length === 0) {
    return path
  }
  let _path = path.toString()
  for (const [key, value] of Object.entries(pathParams)) {
    _path = _path.replace(`:${key}`, value)
  }
  return _path
}
