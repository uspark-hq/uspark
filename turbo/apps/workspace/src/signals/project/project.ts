import { computed } from 'ccstate'
import { projectFiles } from '../external/project-detail'
import { pathParams$ } from '../route'

export const projectFiles$ = computed((get) => {
  const pathParams = get(pathParams$)
  if (!pathParams?.project_id) {
    return undefined
  }

  return get(projectFiles(pathParams.project_id as string))
})
