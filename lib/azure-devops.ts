import * as azdev from 'azure-devops-node-api'
import * as GitApi from 'azure-devops-node-api/GitApi'
import * as BuildApi from 'azure-devops-node-api/BuildApi'
import { env } from './env'

export interface Branch {
  name: string
  lastCommit: string
  author: string
  commitId: string
  lastCommitDate: Date
}

export interface Build {
  id: number
  buildNumber: string
  status: string
  result: string
  startTime: Date
  finishTime?: Date
  sourceBranch: string
  sourceVersion: string
}

export interface BuildDefinition {
  id: number
  name: string
  path: string
  type: string
}

class AzureDevOpsService {
  private connection: azdev.WebApi
  private gitApi: GitApi.IGitApi | null = null
  private buildApi: BuildApi.IBuildApi | null = null

  constructor() {
    const authHandler = azdev.getPersonalAccessTokenHandler(env.AZURE_DEVOPS_PAT)
    const orgUrl = `https://dev.azure.com/${env.AZURE_DEVOPS_ORGANIZATION}`
    
    this.connection = new azdev.WebApi(orgUrl, authHandler)
  }

  private async getGitApi(): Promise<GitApi.IGitApi> {
    if (!this.gitApi) {
      this.gitApi = await this.connection.getGitApi()
    }
    return this.gitApi
  }

  private async getBuildApi(): Promise<BuildApi.IBuildApi> {
    if (!this.buildApi) {
      this.buildApi = await this.connection.getBuildApi()
    }
    return this.buildApi
  }

  async testConnection(): Promise<boolean> {
    try {
      const gitApi = await this.getGitApi()
      const repos = await gitApi.getRepositories(env.AZURE_DEVOPS_PROJECT)
      return repos.length > 0
    } catch (error) {
      console.error('Azure DevOps connection test failed:', error)
      return false
    }
  }

  async getBranches(): Promise<Branch[]> {
    try {
      const gitApi = await this.getGitApi()
      const repos = await gitApi.getRepositories(env.AZURE_DEVOPS_PROJECT)
      
      if (repos.length === 0) {
        throw new Error('No repositories found in the project')
      }

      // Get branches from the first repository (you can modify this logic)
      const repoId = repos[0].id!
      const branches = await gitApi.getBranches(repoId, env.AZURE_DEVOPS_PROJECT)

      const branchesWithCommits = await Promise.all(
        branches.map(async (branch) => {
          try {
            const commits = await gitApi.getCommits(
              repoId,
              {
                itemVersion: {
                  version: branch.name,
                  versionType: 1 // Branch
                },
                $top: 1
              },
              env.AZURE_DEVOPS_PROJECT
            )

            const lastCommit = commits[0]
            
            return {
              name: branch.name!,
              lastCommit: lastCommit?.comment || 'No commits',
              author: lastCommit?.author?.name || 'Unknown',
              commitId: lastCommit?.commitId || '',
              lastCommitDate: lastCommit?.author?.date || new Date()
            }
          } catch (error) {
            console.error(`Error fetching commits for branch ${branch.name}:`, error)
            return {
              name: branch.name!,
              lastCommit: 'Error loading commit',
              author: 'Unknown',
              commitId: '',
              lastCommitDate: new Date()
            }
          }
        })
      )

      return branchesWithCommits
    } catch (error) {
      console.error('Error fetching branches:', error)
      throw error
    }
  }

  async getBuilds(branchName?: string, top: number = 10): Promise<Build[]> {
    try {
      const buildApi = await this.getBuildApi()
      
      const builds = await buildApi.getBuilds(
        env.AZURE_DEVOPS_PROJECT,
        undefined, // definitions
        undefined, // queues
        undefined, // buildNumber
        undefined, // minFinishTime
        undefined, // maxFinishTime
        undefined, // requestedFor
        undefined, // reasonFilter
        undefined, // statusFilter
        undefined, // resultFilter
        undefined, // tagFilters
        undefined, // properties
        top, // top
        undefined, // continuationToken
        undefined, // maxBuildsPerDefinition
        undefined, // deletedFilter
        undefined, // queryOrder
        branchName ? `refs/heads/${branchName}` : undefined // branchName
      )

      return builds.map(build => ({
        id: build.id!,
        buildNumber: build.buildNumber!,
        status: build.status as string,
        result: build.result as string,
        startTime: build.startTime!,
        finishTime: build.finishTime,
        sourceBranch: build.sourceBranch!,
        sourceVersion: build.sourceVersion!
      }))
    } catch (error) {
      console.error('Error fetching builds:', error)
      throw error
    }
  }

  async getBuildDefinitions(): Promise<BuildDefinition[]> {
    try {
      const buildApi = await this.getBuildApi()
      const definitions = await buildApi.getDefinitions(env.AZURE_DEVOPS_PROJECT)

      return definitions.map(def => ({
        id: def.id!,
        name: def.name!,
        path: def.path!,
        type: def.type as string
      }))
    } catch (error) {
      console.error('Error fetching build definitions:', error)
      throw error
    }
  }

  async queueBuild(definitionId: number, sourceBranch: string): Promise<Build> {
    try {
      const buildApi = await this.getBuildApi()
      
      const buildRequest = {
        definition: { id: definitionId },
        sourceBranch: `refs/heads/${sourceBranch}`
      }

      const queuedBuild = await buildApi.queueBuild(buildRequest, env.AZURE_DEVOPS_PROJECT)

      return {
        id: queuedBuild.id!,
        buildNumber: queuedBuild.buildNumber!,
        status: queuedBuild.status as string,
        result: queuedBuild.result as string,
        startTime: queuedBuild.startTime!,
        finishTime: queuedBuild.finishTime,
        sourceBranch: queuedBuild.sourceBranch!,
        sourceVersion: queuedBuild.sourceVersion!
      }
    } catch (error) {
      console.error('Error queuing build:', error)
      throw error
    }
  }
}

export const azureDevOpsService = new AzureDevOpsService()