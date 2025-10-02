import { computed } from 'ccstate'
import {
  projectFiles,
  projectSessions,
  sessionTurns,
  turnDetail,
} from '../external/project-detail'
import { pathParams$, searchParams$ } from '../route'

const projectId$ = computed((get) => {
  const pathParams = get(pathParams$)
  return pathParams?.projectId as string | undefined
})

export const projectFiles$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  return get(projectFiles(projectId))
})

export const projectSessions$ = computed((get) => {
  const projectId = get(projectId$)
  if (!projectId) {
    return Promise.resolve(undefined)
  }

  return get(projectSessions(projectId))
})

const sessionId$ = computed((get) => {
  const searchParams = get(searchParams$)

  return searchParams.get('sessionId') ?? undefined
})

export const selectedSession$ = computed(async (get) => {
  const sessionId = get(sessionId$)
  if (!sessionId) {
    return undefined
  }

  const sessionsResponse = await get(projectSessions$)
  if (!sessionsResponse) {
    return undefined
  }

  const sessions = sessionsResponse.sessions
  return sessions.find((s) => s.id === sessionId)
})

export const turns$ = computed(async (get) => {
  const session = await get(selectedSession$)
  if (!session) {
    return undefined
  }
  const projectId = get(projectId$)
  if (!projectId) {
    return undefined
  }

  const resp = await get(
    sessionTurns({
      projectId: projectId,
      sessionId: session.id,
    }),
  )

  return Promise.all(
    resp.turns.map((turn) => {
      return get(
        turnDetail({
          projectId: projectId,
          sessionId: session.id,
          turnId: turn.id,
        }),
      )
    }),
  )
})
