import { NextRequest, NextResponse } from 'next/server'
import { azureDevOpsService } from '@/lib/azure-devops'

export async function GET(request: NextRequest) {
  try {
    const buildDefinitions = await azureDevOpsService.getBuildDefinitions()
    return NextResponse.json(buildDefinitions)
  } catch (error) {
    console.error('Error fetching build definitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch build definitions' },
      { status: 500 }
    )
  }
}