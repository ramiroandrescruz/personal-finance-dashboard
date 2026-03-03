import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env ?? {}

const repositoryName = processEnv.GITHUB_REPOSITORY?.split('/')[1]
const isGithubActions = processEnv.GITHUB_ACTIONS === 'true'

const base = processEnv.VITE_BASE_PATH ?? (isGithubActions && repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig({
  plugins: [react()],
  base
})
