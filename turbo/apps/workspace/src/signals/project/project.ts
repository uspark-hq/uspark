import { computed } from 'ccstate'
import { projectFiles, projectSessions } from '../external/project-detail'
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

export const selectedSession$ = computed(async (get) => {
  const searchParams = get(searchParams$)
  const sessionsResponse = await get(projectSessions$)
  if (!sessionsResponse) {
    return undefined
  }

  const sessions = sessionsResponse.sessions
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) {
    return undefined
  }

  return sessions.find((s) => s.id === sessionId)
})
