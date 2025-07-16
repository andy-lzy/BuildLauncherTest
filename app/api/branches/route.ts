import { NextRequest, NextResponse } from 'next/server'
import { azureDevOpsService } from '@/lib/azure-devops'

export async function GET(request: NextRequest) {
  try {
    const branches = await azureDevOpsService.getBranches()
    return NextResponse.json(branches)
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}