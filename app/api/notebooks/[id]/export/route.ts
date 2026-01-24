/**
 * Export API - Export learning data for research and analysis
 *
 * GET /api/notebooks/[id]/export
 *   Query params:
 *   - format: 'json' | 'csv' (default: 'json')
 *   - anonymize: 'true' | 'false' (default: 'false')
 *   - include: comma-separated list of 'mastery,interactions,assessments,history'
 */

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, getDriver } from '@/lib/graph/neo4j'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const anonymize = searchParams.get('anonymize') === 'true'
    const includeParam = searchParams.get('include') || 'mastery'
    const includes = includeParam.split(',').map(s => s.trim())

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, name, created_at')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Build export data
    const exportData: ExportData = {
      metadata: {
        notebookId: anonymize ? hashId(notebookId) : notebookId,
        notebookTitle: anonymize ? 'Notebook' : notebook.name,
        exportedAt: new Date().toISOString(),
        format,
        anonymized: anonymize,
        includes,
      },
    }

    // Fetch mastery data from Neo4J
    if (includes.includes('mastery') && isNeo4JAvailable()) {
      exportData.mastery = await fetchMasteryData(notebookId, user.id, anonymize)
    }

    // Fetch interactions from Supabase
    if (includes.includes('interactions')) {
      exportData.interactions = await fetchInteractionsData(supabase, notebookId, user.id, anonymize)
    }

    // Fetch assessments from Supabase
    if (includes.includes('assessments')) {
      exportData.assessments = await fetchAssessmentsData(supabase, notebookId, user.id, anonymize)
    }

    // Format response
    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="learngraph-export-${Date.now()}.csv"`,
        },
      })
    }

    // Default: JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="learngraph-export-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

interface ExportData {
  metadata: {
    notebookId: string
    notebookTitle: string
    exportedAt: string
    format: string
    anonymized: boolean
    includes: string[]
  }
  mastery?: Array<{
    skillId: string
    skillName: string
    pMastery: number
    scaffoldLevel: number
    attemptCount: number
    correctCount: number
    lastPracticeAt: string | null
    masteredAt: string | null
  }>
  interactions?: Array<{
    id: string
    type: string
    skillId: string | null
    timestamp: string
    metadata: Record<string, unknown>
  }>
  assessments?: Array<{
    id: string
    type: string
    status: string
    score: number | null
    completedAt: string | null
    questionCount: number
  }>
}

function hashId(id: string): string {
  // Simple hash for anonymization
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `anon_${Math.abs(hash).toString(36)}`
}

async function fetchMasteryData(
  notebookId: string,
  userId: string,
  anonymize: boolean
): Promise<ExportData['mastery']> {
  const driver = getDriver()
  if (!driver) return []

  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (s:Skill {notebookId: $notebookId})
      OPTIONAL MATCH (s)<-[:HAS_STATE]-(ls:LearnerSkillState {learnerId: $userId})
      RETURN s.id AS skillId,
             s.name AS skillName,
             ls.pMastery AS pMastery,
             ls.scaffoldLevel AS scaffoldLevel,
             ls.attemptCount AS attemptCount,
             ls.correctCount AS correctCount,
             ls.lastPracticeAt AS lastPracticeAt,
             ls.masteredAt AS masteredAt
      `,
      { notebookId, userId }
    )

    return result.records.map(r => ({
      skillId: anonymize ? hashId(r.get('skillId')) : r.get('skillId'),
      skillName: anonymize ? `Skill ${hashId(r.get('skillId')).slice(0, 6)}` : r.get('skillName'),
      pMastery: r.get('pMastery')?.toNumber?.() ?? r.get('pMastery') ?? 0,
      scaffoldLevel: r.get('scaffoldLevel')?.toNumber?.() ?? r.get('scaffoldLevel') ?? 1,
      attemptCount: r.get('attemptCount')?.toNumber?.() ?? r.get('attemptCount') ?? 0,
      correctCount: r.get('correctCount')?.toNumber?.() ?? r.get('correctCount') ?? 0,
      lastPracticeAt: r.get('lastPracticeAt') || null,
      masteredAt: r.get('masteredAt') || null,
    }))
  } finally {
    await session.close()
  }
}

async function fetchInteractionsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  notebookId: string,
  userId: string,
  anonymize: boolean
): Promise<ExportData['interactions']> {
  const { data, error } = await supabase
    .from('learner_interactions')
    .select('id, event_type, skill_id, created_at, payload')
    .eq('notebook_id', notebookId)
    .eq('learner_id', userId)
    .order('created_at', { ascending: true })
    .limit(10000)

  if (error || !data) return []

  return data.map(i => ({
    id: anonymize ? hashId(i.id) : i.id,
    type: i.event_type,
    skillId: i.skill_id ? (anonymize ? hashId(i.skill_id) : i.skill_id) : null,
    timestamp: i.created_at,
    metadata: anonymize ? {} : (i.payload as Record<string, unknown> || {}),
  }))
}

async function fetchAssessmentsData(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  _notebookId: string,
  _userId: string,
  _anonymize: boolean
): Promise<ExportData['assessments']> {
  // TODO: Implement when assessments table is created
  // The assessments table doesn't exist yet - return empty array
  return []
}

function convertToCSV(data: ExportData): string {
  const lines: string[] = []

  // Metadata header
  lines.push('# LearnGraph Export')
  lines.push(`# Exported: ${data.metadata.exportedAt}`)
  lines.push(`# Anonymized: ${data.metadata.anonymized}`)
  lines.push('')

  // Mastery data
  if (data.mastery && data.mastery.length > 0) {
    lines.push('## Mastery Data')
    lines.push('skillId,skillName,pMastery,scaffoldLevel,attemptCount,correctCount,lastPracticeAt,masteredAt')
    for (const m of data.mastery) {
      lines.push([
        m.skillId,
        `"${m.skillName}"`,
        m.pMastery.toFixed(4),
        m.scaffoldLevel,
        m.attemptCount,
        m.correctCount,
        m.lastPracticeAt || '',
        m.masteredAt || '',
      ].join(','))
    }
    lines.push('')
  }

  // Interactions data
  if (data.interactions && data.interactions.length > 0) {
    lines.push('## Interactions')
    lines.push('id,type,skillId,timestamp')
    for (const i of data.interactions) {
      lines.push([
        i.id,
        i.type,
        i.skillId || '',
        i.timestamp,
      ].join(','))
    }
    lines.push('')
  }

  // Assessments data
  if (data.assessments && data.assessments.length > 0) {
    lines.push('## Assessments')
    lines.push('id,type,status,score,completedAt,questionCount')
    for (const a of data.assessments) {
      lines.push([
        a.id,
        a.type,
        a.status,
        a.score?.toFixed(2) || '',
        a.completedAt || '',
        a.questionCount,
      ].join(','))
    }
  }

  return lines.join('\n')
}
