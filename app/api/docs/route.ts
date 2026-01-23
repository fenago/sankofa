/**
 * Docs API - Serves markdown documentation files
 *
 * GET /api/docs?path=/docs/filename.md
 * Optional: &download=true for downloading the file
 */

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// Allowed paths for security
const allowedPaths = [
  '/docs/LearnGraph_Inverse_Profiling_Whitepaper.md',
  '/docs/LearnGraph_Competitive_Positioning.md',
  '/docs/LearnGraph_Educational_Research_Foundations.md',
  '/docs/learngraph_theory.md',
  '/research/learngraph_theory.md',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docPath = searchParams.get('path')
  const download = searchParams.get('download') === 'true'

  if (!docPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  // Security check - only allow specific paths
  if (!allowedPaths.includes(docPath)) {
    return NextResponse.json({ error: 'Invalid document path' }, { status: 403 })
  }

  try {
    // Resolve the path relative to the project root
    const fullPath = path.join(process.cwd(), docPath)
    const content = await readFile(fullPath, 'utf-8')

    if (download) {
      const filename = path.basename(docPath)
      return new Response(content, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown',
      },
    })
  } catch (error) {
    console.error('Error reading doc:', error)
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    )
  }
}
