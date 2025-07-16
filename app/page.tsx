"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Clock, GitBranch, Package, Play, RefreshCw, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Branch {
  name: string
  lastCommit: string
  author: string
  commitId: string
  lastCommitDate: Date
}

interface Build {
  id: number
  buildNumber: string
  status: string
  result: string
  startTime: Date
  finishTime?: Date
  sourceBranch: string
  sourceVersion: string
}

interface BuildDefinition {
  id: number
  name: string
  path: string
  type: string
}

export default function DeploymentDashboard() {
  const { toast } = useToast()
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedBuildDefinition, setSelectedBuildDefinition] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "deploying" | "success" | "error">("idle")
  const [branches, setBranches] = useState<Branch[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [buildDefinitions, setBuildDefinitions] = useState<BuildDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Test connection first
      const connectionResponse = await fetch('/api/test-connection')
      const connectionData = await connectionResponse.json()
      setConnectionStatus(connectionData.connected ? 'connected' : 'error')

      if (!connectionData.connected) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to Azure DevOps. Please check your configuration.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Fetch branches, builds, and build definitions in parallel
      const [branchesResponse, buildsResponse, buildDefinitionsResponse] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/builds?top=5'),
        fetch('/api/build-definitions')
      ])

      if (branchesResponse.ok) {
        const branchesData = await branchesResponse.json()
        setBranches(branchesData)
      }

      if (buildsResponse.ok) {
        const buildsData = await buildsResponse.json()
        setBuilds(buildsData)
      }

      if (buildDefinitionsResponse.ok) {
        const buildDefinitionsData = await buildDefinitionsResponse.json()
        setBuildDefinitions(buildDefinitionsData)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setConnectionStatus('error')
      toast({
        title: "Error",
        description: "Failed to fetch data from Azure DevOps",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (!selectedBranch || !selectedBuildDefinition) return

    setIsDeploying(true)
    setDeploymentStatus("deploying")

    try {
      const response = await fetch('/api/builds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          definitionId: parseInt(selectedBuildDefinition),
          sourceBranch: selectedBranch,
        }),
      })

      if (response.ok) {
        const queuedBuild = await response.json()
        setDeploymentStatus("success")
        toast({
          title: "Build Queued",
          description: `Build ${queuedBuild.buildNumber} has been queued successfully`,
        })
        // Refresh builds list
        fetchData()
      } else {
        throw new Error('Failed to queue build')
      }
    } catch (error) {
      console.error('Error queuing build:', error)
      setDeploymentStatus("error")
      toast({
        title: "Deploy Error",
        description: "Failed to queue build. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "succeeded":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "inprogress":
      case "running":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getBuildResultBadge = (result: string) => {
    switch (result?.toLowerCase()) {
      case "succeeded":
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>
      case "partiallysucceeded":
        return <Badge variant="outline">Partial</Badge>
      default:
        return <Badge variant="secondary">{result || 'Unknown'}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Local Deployment Manager</h1>
            <p className="text-gray-600 mt-1">Deploy your builds locally with branch and version control</p>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>}
            {connectionStatus === 'error' && <Badge variant="destructive">Disconnected</Badge>}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployment Configuration */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Deploy Configuration
                </CardTitle>
                <CardDescription>Select a branch and build definition to queue a build</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Branch Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Branch</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? "Loading branches..." : "Choose a branch"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{branch.name}</div>
                              <div className="text-xs text-gray-500">
                                {branch.lastCommit} • by {branch.author}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Build Definition Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Build Definition</label>
                  <Select value={selectedBuildDefinition} onValueChange={setSelectedBuildDefinition} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? "Loading build definitions..." : "Choose a build definition"} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildDefinitions.map((definition) => (
                        <SelectItem key={definition.id} value={definition.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium">{definition.name}</div>
                              <div className="text-xs text-gray-500">{definition.path}</div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {definition.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Deploy Button */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleDeploy}
                    disabled={!selectedBranch || !selectedBuildDefinition || isDeploying || connectionStatus !== 'connected'}
                    className="flex-1"
                  >
                    {isDeploying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Queueing Build...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Queue Build
                      </>
                    )}
                  </Button>
                </div>

                {/* Deployment Status */}
                {deploymentStatus !== "idle" && (
                  <div className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center gap-2">
                      {deploymentStatus === "deploying" && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                      {deploymentStatus === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {deploymentStatus === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-medium">
                        {deploymentStatus === "deploying" && "Queueing build..."}
                        {deploymentStatus === "success" && "Build queued successfully!"}
                        {deploymentStatus === "error" && "Build queue failed"}
                      </span>
                    </div>
                    {deploymentStatus === "success" && (
                      <p className="text-sm text-gray-600 mt-1">Check the Recent Builds section for status updates</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Deployments */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Builds</CardTitle>
                <CardDescription>Your latest build history from Azure DevOps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : builds.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No builds found
                    </div>
                  ) : (
                    builds.map((build) => (
                      <div key={build.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                        {getStatusIcon(build.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{build.buildNumber}</div>
                          <div className="text-xs text-gray-500">
                            {build.sourceBranch.replace('refs/heads/', '')} • {new Date(build.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getBuildResultBadge(build.result)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Azure DevOps</span>
                    {connectionStatus === 'connected' && <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>}
                    {connectionStatus === 'error' && <Badge variant="destructive">Error</Badge>}
                    {connectionStatus === 'unknown' && <Badge variant="secondary">Unknown</Badge>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Branches</span>
                    <Badge variant="secondary">{branches.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Build Definitions</span>
                    <Badge variant="secondary">{buildDefinitions.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Builds</span>
                    <Badge variant="secondary">{builds.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
