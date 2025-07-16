import { NextRequest, NextResponse } from 'next/server'
import { azureDevOpsService } from '@/lib/azure-devops'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchName = searchParams.get('branch')
    const top = parseInt(searchParams.get('top') || '10')

    const builds = await azureDevOpsService.getBuilds(branchName || undefined, top)
    return NextResponse.json(builds)
  } catch (error) {
    console.error('Error fetching builds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch builds' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { definitionId, sourceBranch } = await request.json()
    
    if (!definitionId || !sourceBranch) {
      return NextResponse.json(
        { error: 'Definition ID and source branch are required' },
        { status: 400 }
      )
    }

    const queuedBuild = await azureDevOpsService.queueBuild(definitionId, sourceBranch)
    return NextResponse.json(queuedBuild)
  } catch (error) {
    console.error('Error queuing build:', error)
    return NextResponse.json(
      { error: 'Failed to queue build' },
      { status: 500 }
    )
  }
}