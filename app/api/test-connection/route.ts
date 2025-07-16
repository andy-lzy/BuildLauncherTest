import { NextRequest, NextResponse } from 'next/server'
import { azureDevOpsService } from '@/lib/azure-devops'

export async function GET(request: NextRequest) {
  try {
    const isConnected = await azureDevOpsService.testConnection()
    return NextResponse.json({ 
      connected: isConnected,
      message: isConnected ? 'Connected to Azure DevOps' : 'Failed to connect to Azure DevOps'
    })
  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      { 
        connected: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}