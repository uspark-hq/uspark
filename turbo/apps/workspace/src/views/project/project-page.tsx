import { useLastResolved, useLoadable } from 'ccstate-react'
import {
  projectFiles$,
  projectSessions$,
  selectedSession$,
} from '../../signals/project/project'
import { Link } from '../router/navigate'

export function ProjectPage() {
  const projectFiles = useLoadable(projectFiles$)
  const projectSessions = useLastResolved(projectSessions$)
  const selectedSession = useLastResolved(selectedSession$)

  if (projectFiles.state === 'loading') {
    return <div>Loading...</div>
  }

  if (projectFiles.state === 'hasError' || !projectFiles.data) {
    return <div>Error loading project files</div>
  }

  return (
    <>
      <div>Project Page</div>
      <pre>{JSON.stringify(projectFiles.data)}</pre>
      <pre>{JSON.stringify(projectSessions)}</pre>
      <pre>{JSON.stringify(selectedSession)}</pre>
      <Link pathname="/">Go to Workspace</Link>
    </>
  )
}
