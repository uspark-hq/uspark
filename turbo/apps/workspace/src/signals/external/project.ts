import { contractFetch } from '@uspark/core/contract-fetch'
import {
  projectsContract,
  type CreateProjectResponse,
} from '@uspark/core/contracts/projects.contract'
import { command } from 'ccstate'
import { fetch$ } from '../fetch'

export const createProject$ = command(
  async (
    { get },
    params: { name: string },
    signal: AbortSignal,
  ): Promise<CreateProjectResponse> => {
    const workspaceFetch = get(fetch$)

    return await contractFetch(projectsContract.createProject, {
      body: {
        name: params.name,
      },
      fetch: workspaceFetch as typeof globalThis.fetch,
      signal,
    })
  },
)
