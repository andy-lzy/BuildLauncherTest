import { z } from 'zod'

const envSchema = z.object({
  AZURE_DEVOPS_ORGANIZATION: z.string().min(1, 'Azure DevOps organization is required'),
  AZURE_DEVOPS_PROJECT: z.string().min(1, 'Azure DevOps project is required'),
  AZURE_DEVOPS_PAT: z.string().min(1, 'Azure DevOps Personal Access Token is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
})

export const env = envSchema.parse(process.env)