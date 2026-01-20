import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import {
  EnhancedBKT,
  fitSkillBKT,
  getNotebookBKTParams,
  getSkillBKTParams,
  type BKTParams,
  type ValidationMetrics,
  type FittingResult,
  type PracticeAttempt,
} from '@/lib/graph/enhanced-bkt'
import { getLearnerStatesByNotebook } from '@/lib/graph/learner-state'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface SkillValidation {
  skillId: string
  skillName?: string
  metrics: ValidationMetrics
  params: BKTParams
  fitQuality: string
  sampleSize: number
}

// GET /api/notebooks/[id]/learner/validate - Get BKT validation metrics
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, settings')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const action = searchParams.get('action') || 'overview'
    const skillId = searchParams.get('skillId')
    const learnerId = user.id

    switch (action) {
      case 'overview': {
        // Get overall validation metrics across all skills
        const { data: interactions } = await supabase
          .from('learner_interactions')
          .select('skill_id, payload, created_at')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .eq('event_type', 'practice_attempt')
          .order('created_at', { ascending: true })

        if (!interactions || interactions.length === 0) {
          return NextResponse.json({
            available: true,
            hasData: false,
            message: 'No practice data available for validation',
          })
        }

        // Group by skill
        const skillAttempts = new Map<string, PracticeAttempt[]>()
        for (const interaction of interactions) {
          if (!interaction.skill_id) continue
          const attempts = skillAttempts.get(interaction.skill_id) || []
          const payload = interaction.payload as { isCorrect?: boolean }
          attempts.push({
            isCorrect: payload.isCorrect ?? false,
            timestamp: new Date(interaction.created_at).getTime(),
            skillId: interaction.skill_id,
          })
          skillAttempts.set(interaction.skill_id, attempts)
        }

        // Calculate validation for each skill
        const skillValidations: SkillValidation[] = []
        let totalAuc = 0
        let totalBrier = 0
        let totalSamples = 0
        let validSkillCount = 0

        for (const [sid, attempts] of skillAttempts.entries()) {
          if (attempts.length < 5) continue // Skip skills with insufficient data

          // Get or use default params
          const storedParams = await getSkillBKTParams(sid)
          const bkt = new EnhancedBKT(storedParams || undefined, { skillId: sid })

          const metrics = bkt.calculateValidationMetrics(attempts)

          skillValidations.push({
            skillId: sid,
            metrics,
            params: bkt.getParams(),
            fitQuality: storedParams ? 'fitted' : 'default',
            sampleSize: attempts.length,
          })

          totalAuc += metrics.auc * attempts.length
          totalBrier += metrics.brierScore * attempts.length
          totalSamples += attempts.length
          validSkillCount++
        }

        // Calculate aggregate metrics
        const aggregateMetrics = totalSamples > 0 ? {
          avgAuc: totalAuc / totalSamples,
          avgBrierScore: totalBrier / totalSamples,
          totalInteractions: interactions.length,
          validatedSkills: validSkillCount,
          overallQuality: totalAuc / totalSamples >= 0.7 ? 'good' :
                         totalAuc / totalSamples >= 0.6 ? 'acceptable' : 'needs_improvement',
        } : null

        return NextResponse.json({
          available: true,
          hasData: true,
          aggregateMetrics,
          skillValidations: skillValidations.slice(0, 20), // Limit response size
          totalSkillsWithData: skillAttempts.size,
        })
      }

      case 'skill': {
        // Get validation for a specific skill
        if (!skillId) {
          return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
        }

        const { data: interactions } = await supabase
          .from('learner_interactions')
          .select('payload, created_at')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .eq('skill_id', skillId)
          .eq('event_type', 'practice_attempt')
          .order('created_at', { ascending: true })

        if (!interactions || interactions.length < 2) {
          return NextResponse.json({
            available: true,
            hasData: false,
            message: 'Insufficient practice data for this skill',
            minRequired: 5,
            currentCount: interactions?.length || 0,
          })
        }

        const attempts: PracticeAttempt[] = interactions.map(i => ({
          isCorrect: (i.payload as { isCorrect?: boolean }).isCorrect ?? false,
          timestamp: new Date(i.created_at).getTime(),
        }))

        const storedParams = await getSkillBKTParams(skillId)
        const bkt = new EnhancedBKT(storedParams || undefined, { skillId })
        const metrics = bkt.calculateValidationMetrics(attempts)

        // Also get mastery estimate with confidence interval
        const masteryEstimate = bkt.getMasteryWithConfidence(attempts)

        return NextResponse.json({
          available: true,
          hasData: true,
          skillId,
          metrics,
          params: bkt.getParams(),
          masteryEstimate,
          sampleSize: attempts.length,
        })
      }

      case 'params': {
        // Get all skill-specific BKT parameters for notebook
        const paramsMap = await getNotebookBKTParams(notebookId)
        const params: Record<string, BKTParams> = {}
        for (const [sid, p] of paramsMap.entries()) {
          params[sid] = p
        }

        return NextResponse.json({
          available: true,
          skillParams: params,
          count: paramsMap.size,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in learner validation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/learner/validate - Fit BKT parameters
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, settings')
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    if (!isNeo4JAvailable()) {
      return NextResponse.json({
        available: false,
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const body = await request.json()
    const { action, skillId, skillIds } = body
    const learnerId = user.id

    switch (action) {
      case 'fit_skill': {
        // Fit parameters for a single skill
        if (!skillId) {
          return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
        }

        const { data: interactions } = await supabase
          .from('learner_interactions')
          .select('payload, created_at')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .eq('skill_id', skillId)
          .eq('event_type', 'practice_attempt')
          .order('created_at', { ascending: true })

        if (!interactions || interactions.length < 5) {
          return NextResponse.json({
            available: true,
            success: false,
            message: 'Insufficient data for parameter fitting',
            minRequired: 5,
            currentCount: interactions?.length || 0,
          })
        }

        const attempts: PracticeAttempt[] = interactions.map(i => ({
          isCorrect: (i.payload as { isCorrect?: boolean }).isCorrect ?? false,
          timestamp: new Date(i.created_at).getTime(),
        }))

        const result = await fitSkillBKT(skillId, attempts, true)

        return NextResponse.json({
          available: true,
          success: result.converged && result.fitQuality !== 'poor',
          skillId,
          fittingResult: result,
        })
      }

      case 'fit_all': {
        // Fit parameters for all skills with sufficient data
        const { data: interactions } = await supabase
          .from('learner_interactions')
          .select('skill_id, payload, created_at')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .eq('event_type', 'practice_attempt')
          .order('created_at', { ascending: true })

        if (!interactions || interactions.length === 0) {
          return NextResponse.json({
            available: true,
            success: false,
            message: 'No practice data available',
          })
        }

        // Group by skill
        const skillAttempts = new Map<string, PracticeAttempt[]>()
        for (const interaction of interactions) {
          if (!interaction.skill_id) continue
          const attempts = skillAttempts.get(interaction.skill_id) || []
          const payload = interaction.payload as { isCorrect?: boolean }
          attempts.push({
            isCorrect: payload.isCorrect ?? false,
            timestamp: new Date(interaction.created_at).getTime(),
            skillId: interaction.skill_id,
          })
          skillAttempts.set(interaction.skill_id, attempts)
        }

        // Fit parameters for skills with enough data
        const results: Record<string, FittingResult> = {}
        let successCount = 0
        let failCount = 0

        for (const [sid, attempts] of skillAttempts.entries()) {
          if (attempts.length < 5) {
            failCount++
            continue
          }

          const result = await fitSkillBKT(sid, attempts, true)
          results[sid] = result

          if (result.converged && result.fitQuality !== 'poor') {
            successCount++
          } else {
            failCount++
          }
        }

        return NextResponse.json({
          available: true,
          success: true,
          fittedSkills: successCount,
          skippedSkills: failCount,
          totalSkills: skillAttempts.size,
          results,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fitting BKT parameters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
