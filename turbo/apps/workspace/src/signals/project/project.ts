import { computed } from 'ccstate'
import { projectFiles } from '../external/project-detail'
import { pathParams$ } from '../route'

export const projectFiles$ = computed((get) => {
  const pathParams = get(pathParams$)
  if (!pathParams?.projectId) {
    return undefined
  }

  return get(projectFiles(pathParams.projectId as string))
})
