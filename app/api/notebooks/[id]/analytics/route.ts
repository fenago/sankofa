/**
 * Analytics API - Learning analytics and impact measurement
 *
 * GET /api/notebooks/[id]/analytics
 *   Query params:
 *   - type: 'dashboard' | 'learning-gains' | 'retention' | 'time-to-mastery' | 'transfer'
 *   - period: 'week' | 'month' | 'all' (default: 'all')
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, getDriver } from '@/lib/graph/neo4j'
import {
  calculateOverallLearningGains,
  calculateRetentionSummary,
  calculateTimeToMasterySummary,
  calculateTransferSummary,
  type AnalyticsDashboard,
  type OverallLearningGain,
  type RetentionSummary,
  type TimeToMasterySummary,
  type TransferSummary,
} from '@/lib/analytics'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'
    const period = searchParams.get('period') || 'all'

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Analytics requires knowledge graph to be configured',
      })
    }

    // Calculate period dates
    const periodDates = getPeriodDates(period)

    // Fetch data from Neo4J
    const analyticsData = await fetchAnalyticsData(notebookId, user.id, periodDates)

    // Calculate requested analytics
    switch (type) {
      case 'learning-gains':
        return NextResponse.json({
          available: true,
          learningGains: calculateOverallLearningGains(
            analyticsData.skillHistory,
            periodDates?.start,
            periodDates?.end
          ),
        })

      case 'retention':
        return NextResponse.json({
          available: true,
          retention: calculateRetentionSummary(analyticsData.retentionData),
        })

      case 'time-to-mastery':
        return NextResponse.json({
          available: true,
          timeToMastery: calculateTimeToMasterySummary(analyticsData.practiceData),
        })

      case 'transfer':
        return NextResponse.json({
          available: true,
          transfer: calculateTransferSummary(analyticsData.transferData),
        })

      case 'dashboard':
      default:
        const dashboard = buildDashboard(analyticsData, periodDates)
        return NextResponse.json({
          available: true,
          ...dashboard,
        })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function getPeriodDates(period: string): { start: Date; end: Date } | undefined {
  const now = new Date()
  const end = now

  switch (period) {
    case 'week':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end,
      }
    case 'month':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end,
      }
    case 'all':
    default:
      return undefined
  }
}

interface AnalyticsRawData {
  skillHistory: Array<{
    skillId: string
    skillName: string
    masteryHistory: Array<{ pMastery: number; recordedAt: Date }>
  }>
  retentionData: Array<{
    skillId: string
    skillName: string
    initialMastery: number
    currentMastery: number
    lastPracticeAt: Date
    reviews: Array<{ scheduledAt: Date; completedAt: Date | null }>
  }>
  practiceData: Array<{
    skillId: string
    skillName: string
    bloomLevel: number
    difficulty: number
    firstAttemptAt: Date
    masteredAt: Date | null
    currentMastery: number
    attempts: Array<{ attemptedAt: Date; responseTimeMs: number; correct: boolean }>
  }>
  transferData: Array<{
    skillId: string
    skillName: string
    practiceAttempts: Array<{ isNovel: boolean; correct: boolean; questionType: string }>
  }>
  summary: {
    totalSkills: number
    masteredSkills: number
    inProgressSkills: number
    totalPracticeTime: number
    totalAttempts: number
    correctAttempts: number
    streakDays: number
  }
}

async function fetchAnalyticsData(
  notebookId: string,
  userId: string,
  periodDates?: { start: Date; end: Date }
): Promise<AnalyticsRawData> {
  const driver = getDriver()
  if (!driver) {
    throw new Error('Neo4J driver not available')
  }

  const session = driver.session()

  try {
    // Fetch skills with learner state
    const skillsResult = await session.run(
      `
      MATCH (s:Skill {notebookId: $notebookId})
      OPTIONAL MATCH (s)<-[:HAS_STATE]-(ls:LearnerSkillState {learnerId: $userId})
      RETURN s.id AS skillId,
             s.name AS skillName,
             s.bloomLevel AS bloomLevel,
             s.difficulty AS difficulty,
             ls.pMastery AS pMastery,
             ls.scaffoldLevel AS scaffoldLevel,
             ls.easeFactor AS easeFactor,
             ls.nextReviewAt AS nextReviewAt,
             ls.lastPracticeAt AS lastPracticeAt,
             ls.firstPracticeAt AS firstPracticeAt,
             ls.masteredAt AS masteredAt,
             ls.attemptCount AS attemptCount,
             ls.correctCount AS correctCount,
             ls.totalResponseTimeMs AS totalResponseTimeMs,
             ls.consecutiveCorrect AS consecutiveCorrect
      `,
      { notebookId, userId }
    )

    const skills = skillsResult.records.map(r => ({
      skillId: r.get('skillId'),
      skillName: r.get('skillName'),
      bloomLevel: r.get('bloomLevel')?.toNumber?.() ?? r.get('bloomLevel') ?? 1,
      difficulty: r.get('difficulty')?.toNumber?.() ?? r.get('difficulty') ?? 5,
      pMastery: r.get('pMastery')?.toNumber?.() ?? r.get('pMastery') ?? 0,
      easeFactor: r.get('easeFactor')?.toNumber?.() ?? r.get('easeFactor') ?? 2.5,
      nextReviewAt: r.get('nextReviewAt'),
      lastPracticeAt: r.get('lastPracticeAt'),
      firstPracticeAt: r.get('firstPracticeAt'),
      masteredAt: r.get('masteredAt'),
      attemptCount: r.get('attemptCount')?.toNumber?.() ?? r.get('attemptCount') ?? 0,
      correctCount: r.get('correctCount')?.toNumber?.() ?? r.get('correctCount') ?? 0,
      totalResponseTimeMs: r.get('totalResponseTimeMs')?.toNumber?.() ?? r.get('totalResponseTimeMs') ?? 0,
    }))

    // Build analytics data structures
    const skillHistory = skills.map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      masteryHistory: s.pMastery > 0 ? [
        { pMastery: 0.1, recordedAt: s.firstPracticeAt ? new Date(s.firstPracticeAt) : new Date() },
        { pMastery: s.pMastery, recordedAt: s.lastPracticeAt ? new Date(s.lastPracticeAt) : new Date() },
      ] : [],
    }))

    const retentionData = skills.filter(s => s.pMastery > 0).map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      initialMastery: s.pMastery, // Simplified - would need history for real initial
      currentMastery: s.pMastery,
      lastPracticeAt: s.lastPracticeAt ? new Date(s.lastPracticeAt) : new Date(),
      reviews: [], // Would need review history from interactions
    }))

    const practiceData = skills.map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      bloomLevel: s.bloomLevel,
      difficulty: s.difficulty,
      firstAttemptAt: s.firstPracticeAt ? new Date(s.firstPracticeAt) : new Date(),
      masteredAt: s.masteredAt ? new Date(s.masteredAt) : null,
      currentMastery: s.pMastery,
      attempts: s.attemptCount > 0 ? Array(s.attemptCount).fill(null).map((_, i) => ({
        attemptedAt: new Date(),
        responseTimeMs: s.totalResponseTimeMs / s.attemptCount,
        correct: i < s.correctCount,
      })) : [],
    }))

    const transferData = skills.map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      practiceAttempts: [], // Would need question type data from interactions
    }))

    // Calculate summary stats
    const totalSkills = skills.length
    const masteredSkills = skills.filter(s => s.pMastery >= 0.8).length
    const inProgressSkills = skills.filter(s => s.pMastery > 0 && s.pMastery < 0.8).length
    const totalAttempts = skills.reduce((sum, s) => sum + s.attemptCount, 0)
    const correctAttempts = skills.reduce((sum, s) => sum + s.correctCount, 0)
    const totalPracticeTime = skills.reduce((sum, s) => sum + s.totalResponseTimeMs, 0)

    return {
      skillHistory,
      retentionData,
      practiceData,
      transferData,
      summary: {
        totalSkills,
        masteredSkills,
        inProgressSkills,
        totalPracticeTime,
        totalAttempts,
        correctAttempts,
        streakDays: 0, // Would need interaction history
      },
    }
  } finally {
    await session.close()
  }
}

function buildDashboard(
  data: AnalyticsRawData,
  periodDates?: { start: Date; end: Date }
): AnalyticsDashboard {
  return {
    learningGains: calculateOverallLearningGains(
      data.skillHistory,
      periodDates?.start,
      periodDates?.end
    ),
    retention: calculateRetentionSummary(data.retentionData),
    timeToMastery: calculateTimeToMasterySummary(data.practiceData),
    transfer: calculateTransferSummary(data.transferData),
    summary: {
      ...data.summary,
      averageAccuracy: data.summary.totalAttempts > 0
        ? data.summary.correctAttempts / data.summary.totalAttempts
        : 0,
    },
  }
}
