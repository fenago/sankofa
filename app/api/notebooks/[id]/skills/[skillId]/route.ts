/**
 * Single Skill API
 *
 * GET /api/notebooks/[id]/skills/[skillId]
 *   - Returns skill details with learner state, prerequisites, and dependents
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import { getSkillById, getSkillPrerequisites, getSkillDependents } from '@/lib/graph/store'
import { getLearnerSkillState, getLearnerStatesByNotebook } from '@/lib/graph/learner-state'
import type { SkillNode, LearnerSkillState } from '@/lib/types/graph'

interface RouteParams {
  params: Promise<{ id: string; skillId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId, skillId } = await params
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
        message: 'Knowledge graph features are not configured. Neo4J connection required.',
      }, { status: 503 })
    }

    const learnerId = user.id

    // Get skill details
    const skill = await getSkillById(skillId)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Verify skill belongs to this notebook
    if (skill.notebookId !== notebookId) {
      return NextResponse.json({ error: 'Skill not found in this notebook' }, { status: 404 })
    }

    // Get learner state for this skill
    const learnerState = await getLearnerSkillState(learnerId, skillId)

    // Get all learner states for this notebook (for prerequisite mastery info)
    const allStates = await getLearnerStatesByNotebook(learnerId, notebookId)
    const stateMap = new Map<string, LearnerSkillState>(
      allStates.map(s => [s.skillId, s])
    )

    // Get prerequisites and dependents
    const prereqResults = await getSkillPrerequisites(skillId)
    const dependentResults = await getSkillDependents(skillId)

    // Enhance prerequisites with learner state
    const prerequisites = prereqResults.map(p => ({
      skill: p.skill,
      relationship: p.relationship,
      learnerState: stateMap.get(p.skill.id) || null,
    }))

    // Enhance dependents with learner state
    const dependents = dependentResults.map(d => ({
      skill: d.skill,
      relationship: d.relationship,
      learnerState: stateMap.get(d.skill.id) || null,
    }))

    // Calculate readiness (all required prerequisites mastered?)
    const requiredPrereqs = prerequisites.filter(p => p.relationship.strength === 'required')
    const allRequiredMastered = requiredPrereqs.every(
      p => p.learnerState && p.learnerState.pMastery >= (skill.masteryThreshold || 0.8)
    )
    const readinessScore = requiredPrereqs.length === 0
      ? 1
      : requiredPrereqs.filter(p =>
          p.learnerState && p.learnerState.pMastery >= (skill.masteryThreshold || 0.8)
        ).length / requiredPrereqs.length

    return NextResponse.json({
      available: true,
      skill,
      learnerState,
      prerequisites,
      dependents,
      readiness: {
        ready: allRequiredMastered || requiredPrereqs.length === 0,
        score: readinessScore,
        requiredCount: requiredPrereqs.length,
        masteredCount: requiredPrereqs.filter(p =>
          p.learnerState && p.learnerState.pMastery >= (skill.masteryThreshold || 0.8)
        ).length,
      },
    })
  } catch (error) {
    console.error('Error fetching skill details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
