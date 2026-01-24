/**
 * Cohort Analytics API - Class-wide learning analytics for educators
 *
 * GET /api/notebooks/[id]/analytics/cohort
 *   Returns cohort analytics for all students with access to this notebook
 *
 * Note: This is a placeholder for future multi-user/classroom features.
 * Currently returns single-user data structured for cohort analysis.
 */

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, getDriver } from '@/lib/graph/neo4j'
import {
  calculateCohortAnalytics,
  identifyAtRiskStudents,
  calculateClassVelocity,
  type CohortAnalytics,
} from '@/lib/analytics'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership (educator access)
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found or access denied' }, { status: 404 })
    }

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Cohort analytics requires knowledge graph to be configured',
      })
    }

    // For now, return single-user data (future: aggregate across shared notebook users)
    const cohortData = await fetchCohortData(notebookId, user.id)

    const analytics = calculateCohortAnalytics(cohortData.students, cohortData.misconceptions)
    const atRiskStudents = identifyAtRiskStudents(analytics.classProgress)
    const velocity = calculateClassVelocity(cohortData.weeklySnapshots)

    return NextResponse.json({
      available: true,
      cohort: analytics,
      atRiskStudents,
      velocity,
      studentCount: cohortData.students.length,
      // Future: add comparison to other cohorts, benchmarks, etc.
    })
  } catch (error) {
    console.error('Cohort analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

interface CohortRawData {
  students: Array<{
    id: string
    name?: string
    email?: string
    skills: Array<{
      skillId: string
      skillName: string
      pMastery: number
      lastPracticeAt: Date | null
    }>
    interactions: Array<{
      type: string
      skillId: string
      timestamp: Date
      metadata?: Record<string, unknown>
    }>
    totalPracticeTimeMs: number
  }>
  misconceptions: Array<{
    skillId: string
    misconception: string
    studentIds: string[]
  }>
  weeklySnapshots: Array<{
    week: string
    averageMastery: number
  }>
}

async function fetchCohortData(notebookId: string, userId: string): Promise<CohortRawData> {
  const driver = getDriver()
  if (!driver) {
    throw new Error('Neo4J driver not available')
  }

  const session = driver.session()

  try {
    // Fetch skills for current user (single-user mode)
    const result = await session.run(
      `
      MATCH (s:Skill {notebookId: $notebookId})
      OPTIONAL MATCH (s)<-[:HAS_STATE]-(ls:LearnerSkillState {learnerId: $userId})
      RETURN s.id AS skillId,
             s.name AS skillName,
             ls.pMastery AS pMastery,
             ls.lastPracticeAt AS lastPracticeAt,
             ls.totalResponseTimeMs AS totalResponseTimeMs
      `,
      { notebookId, userId }
    )

    const skills = result.records.map(r => ({
      skillId: r.get('skillId'),
      skillName: r.get('skillName'),
      pMastery: r.get('pMastery')?.toNumber?.() ?? r.get('pMastery') ?? 0,
      lastPracticeAt: r.get('lastPracticeAt') ? new Date(r.get('lastPracticeAt')) : null,
      totalResponseTimeMs: r.get('totalResponseTimeMs')?.toNumber?.() ?? r.get('totalResponseTimeMs') ?? 0,
    }))

    const totalPracticeTime = skills.reduce((sum, s) => sum + (s.totalResponseTimeMs || 0), 0)

    // Single student for now
    const students = [{
      id: userId,
      skills: skills.map(s => ({
        skillId: s.skillId,
        skillName: s.skillName,
        pMastery: s.pMastery,
        lastPracticeAt: s.lastPracticeAt,
      })),
      interactions: [],
      totalPracticeTimeMs: totalPracticeTime,
    }]

    // Placeholder for misconceptions (would need interaction analysis)
    const misconceptions: Array<{ skillId: string; misconception: string; studentIds: string[] }> = []

    // Placeholder for weekly snapshots (would need historical data)
    const weeklySnapshots: Array<{ week: string; averageMastery: number }> = []

    return {
      students,
      misconceptions,
      weeklySnapshots,
    }
  } finally {
    await session.close()
  }
}
