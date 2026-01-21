/**
 * Framework Dashboard API
 *
 * Provides aggregated educational psychology framework data for a learner.
 *
 * GET /api/notebooks/[id]/profile/frameworks
 * Returns: FrameworkDashboard with all 8 frameworks interpreted
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable, getSession } from '@/lib/graph/neo4j'
import { getMasteredSkillIds, getLearnerStatesByNotebook } from '@/lib/graph/learner-state'
import { getZPDSkills } from '@/lib/graph/store'
import { buildFrameworkDashboard } from '@/lib/profile/framework-interpreter'
import type { InverseProfile } from '@/lib/types/interactions'

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

    const learnerId = user.id

    // Verify notebook exists
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Fetch inverse profile
    const { data: profileData } = await supabase
      .from('inverse_profiles')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .single()

    const profile: InverseProfile | null = profileData
      ? {
          id: profileData.id,
          learner_id: profileData.learner_id,
          notebook_id: profileData.notebook_id,
          version: profileData.version,
          computed_at: profileData.computed_at,
          interactions_analyzed: profileData.interactions_analyzed,
          knowledge_state: profileData.knowledge_state as unknown as InverseProfile['knowledge_state'],
          cognitive_indicators: profileData.cognitive_indicators as unknown as InverseProfile['cognitive_indicators'],
          metacognitive_indicators: profileData.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators'],
          motivational_indicators: profileData.motivational_indicators as unknown as InverseProfile['motivational_indicators'],
          behavioral_patterns: profileData.behavioral_patterns as unknown as InverseProfile['behavioral_patterns'],
          confidence_scores: profileData.confidence_scores as unknown as InverseProfile['confidence_scores'],
        }
      : null

    // Initialize stats with defaults
    let stats = {
      skills: { total: 0, mastered: 0, inProgress: 0, notStarted: 0 },
      practice: { totalAttempts: 0, avgDifficulty: 0.5, avgAccuracy: 0.5 },
      sm2: { dueSkills: 0, totalScheduled: 0, overdueCount: 0, avgInterval: 0 },
      bloom: {} as Record<number, { total: number; mastered: number }>,
      sessions: { avgDurationMin: 0, totalSessions: 0 },
      zpd: { zpdSkillCount: 0 },
      threshold: { total: 0, mastered: 0, inProgress: 0 },
    }

    // Fetch Neo4J data if available
    if (isNeo4JAvailable()) {
      try {
        const session = getSession()
        if (!session) {
          throw new Error('Failed to get Neo4J session')
        }

        // Get all skills for this notebook
        const skillsResult = await session.run(
          `MATCH (s:Skill {notebookId: $notebookId})
           RETURN s.id AS id, s.bloomLevel AS bloomLevel, s.isThresholdConcept AS isThreshold`,
          { notebookId }
        )

        const allSkills = skillsResult.records.map(r => ({
          id: r.get('id') as string,
          bloomLevel: r.get('bloomLevel') as number,
          isThreshold: r.get('isThreshold') as boolean,
        }))

        stats.skills.total = allSkills.length

        // Initialize bloom levels
        for (let level = 1; level <= 6; level++) {
          stats.bloom[level] = { total: 0, mastered: 0 }
        }

        // Count skills by bloom level
        for (const skill of allSkills) {
          if (skill.bloomLevel >= 1 && skill.bloomLevel <= 6) {
            stats.bloom[skill.bloomLevel].total++
          }
          if (skill.isThreshold) {
            stats.threshold.total++
          }
        }

        // Get learner states
        const learnerStates = await getLearnerStatesByNotebook(learnerId, notebookId)
        const masteredIds = new Set(
          learnerStates
            .filter(s => s.masteryStatus === 'mastered')
            .map(s => s.skillId)
        )
        const inProgressIds = new Set(
          learnerStates
            .filter(s => s.masteryStatus === 'learning')
            .map(s => s.skillId)
        )

        stats.skills.mastered = masteredIds.size
        stats.skills.inProgress = inProgressIds.size
        stats.skills.notStarted = stats.skills.total - masteredIds.size - inProgressIds.size

        // Count mastered by bloom level and threshold
        for (const skill of allSkills) {
          if (masteredIds.has(skill.id)) {
            if (skill.bloomLevel >= 1 && skill.bloomLevel <= 6) {
              stats.bloom[skill.bloomLevel].mastered++
            }
            if (skill.isThreshold) {
              stats.threshold.mastered++
            }
          } else if (inProgressIds.has(skill.id) && skill.isThreshold) {
            stats.threshold.inProgress++
          }
        }

        // Get ZPD skills
        const zpdSkills = await getZPDSkills(notebookId, Array.from(masteredIds))
        stats.zpd.zpdSkillCount = zpdSkills.length

        // Get SM-2 review data
        const now = new Date()
        let totalInterval = 0
        let scheduledCount = 0

        for (const state of learnerStates) {
          if (state.spacedRepetition?.nextReviewAt) {
            scheduledCount++
            const nextReview = new Date(state.spacedRepetition.nextReviewAt)
            if (nextReview <= now) {
              stats.sm2.dueSkills++
              // Check if overdue (more than 1 day past)
              const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
              if (nextReview < oneDayAgo) {
                stats.sm2.overdueCount++
              }
            }
            if (state.spacedRepetition.interval) {
              totalInterval += state.spacedRepetition.interval
            }
          }
        }

        stats.sm2.totalScheduled = scheduledCount
        stats.sm2.avgInterval = scheduledCount > 0 ? Math.round(totalInterval / scheduledCount) : 0

        await session.close()
      } catch (neo4jError) {
        console.error('Error fetching Neo4J data:', neo4jError)
      }
    }

    // Fetch practice stats from Supabase
    const { data: practiceInteractions } = await supabase
      .from('learner_interactions')
      .select('payload')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)
      .eq('event_type', 'practice_attempt')

    if (practiceInteractions && practiceInteractions.length > 0) {
      let totalDifficulty = 0
      let correctCount = 0

      for (const interaction of practiceInteractions) {
        const payload = interaction.payload as Record<string, unknown>
        if (payload?.difficulty !== undefined) {
          totalDifficulty += payload.difficulty as number
        }
        if (payload?.isCorrect === true) {
          correctCount++
        }
      }

      stats.practice.totalAttempts = practiceInteractions.length
      stats.practice.avgDifficulty = totalDifficulty / practiceInteractions.length
      stats.practice.avgAccuracy = correctCount / practiceInteractions.length
    }

    // Fetch session stats
    const { data: sessions } = await supabase
      .from('learner_sessions')
      .select('duration_ms')
      .eq('notebook_id', notebookId)
      .eq('learner_id', learnerId)

    if (sessions && sessions.length > 0) {
      const totalDurationMs = sessions.reduce((sum, s) => sum + (s.duration_ms || 0), 0)
      stats.sessions.totalSessions = sessions.length
      stats.sessions.avgDurationMin = Math.round(totalDurationMs / sessions.length / 60000)
    }

    // Build the dashboard
    const dashboard = buildFrameworkDashboard(learnerId, notebookId, profile, stats)

    return NextResponse.json({
      success: true,
      dashboard,
      hasProfile: profile !== null,
      lastUpdated: profile?.computed_at ?? null,
    })
  } catch (error) {
    console.error('Error building framework dashboard:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
