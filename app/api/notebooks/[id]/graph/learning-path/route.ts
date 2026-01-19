import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import {
  generateLearningPath,
  getZPDSkills,
  getCurriculumOverview,
  getRootSkills,
  getSkillsByNotebook,
} from '@/lib/graph/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/graph/learning-path - Get learning path options
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

    const action = searchParams.get('action') || 'overview'

    switch (action) {
      case 'overview': {
        // Get curriculum overview grouped by Bloom levels
        const overview = await getCurriculumOverview(notebookId)
        const rootSkills = await getRootSkills(notebookId)

        return NextResponse.json({
          available: true,
          overview,
          entryPoints: rootSkills,
          message: rootSkills.length === 0
            ? 'No skills extracted yet. Extract the knowledge graph first.'
            : undefined,
        })
      }

      case 'zpd': {
        // Get Zone of Proximal Development skills
        const masteredIds = searchParams.get('mastered')?.split(',').filter(Boolean) || []
        const zpdSkills = await getZPDSkills(notebookId, masteredIds)

        return NextResponse.json({
          available: true,
          zpdSkills,
          masteredCount: masteredIds.length,
          message: zpdSkills.length === 0
            ? 'All skills mastered or no skills available.'
            : `Found ${zpdSkills.length} skills in your Zone of Proximal Development.`,
        })
      }

      case 'path': {
        // Generate learning path to a goal skill
        const goalSkillId = searchParams.get('goal')
        if (!goalSkillId) {
          return NextResponse.json({ error: 'Goal skill ID required' }, { status: 400 })
        }

        const masteredIds = searchParams.get('mastered')?.split(',').filter(Boolean) || []
        const learningPath = await generateLearningPath(notebookId, goalSkillId, masteredIds)

        return NextResponse.json({
          available: true,
          learningPath,
          message: learningPath.path.length === 0
            ? 'Goal skill already mastered or not found.'
            : `Learning path with ${learningPath.path.length} skills, estimated ${Math.round(learningPath.totalEstimatedMinutes / 60)} hours.`,
        })
      }

      case 'all-skills': {
        // Get all skills with full details
        const skills = await getSkillsByNotebook(notebookId)
        return NextResponse.json({
          available: true,
          skills,
          count: skills.length,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in learning path API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/graph/learning-path - Generate personalized learning path
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

    const body = await request.json()
    const { goalSkillId, masteredSkillIds = [], preferences } = body

    if (!goalSkillId) {
      return NextResponse.json({ error: 'Goal skill ID required' }, { status: 400 })
    }

    // Generate the learning path
    const learningPath = await generateLearningPath(notebookId, goalSkillId, masteredSkillIds)

    // Apply preferences if provided
    let optimizedPath = learningPath.path

    if (preferences?.prioritizeThreshold) {
      // Move threshold concepts earlier (after their prerequisites)
      // This helps unlock new understanding domains sooner
    }

    if (preferences?.maxDailyMinutes) {
      // Group skills into daily chunks based on time limit
      const dailyChunks: typeof optimizedPath[] = []
      let currentChunk: typeof optimizedPath = []
      let currentMinutes = 0

      for (const skill of optimizedPath) {
        const skillMinutes = skill.estimatedMinutes || 30
        if (currentMinutes + skillMinutes > preferences.maxDailyMinutes && currentChunk.length > 0) {
          dailyChunks.push(currentChunk)
          currentChunk = []
          currentMinutes = 0
        }
        currentChunk.push(skill)
        currentMinutes += skillMinutes
      }
      if (currentChunk.length > 0) {
        dailyChunks.push(currentChunk)
      }

      return NextResponse.json({
        available: true,
        learningPath: {
          ...learningPath,
          dailyChunks,
          estimatedDays: dailyChunks.length,
        },
        preferences,
      })
    }

    // Get ZPD skills based on current mastery
    const zpdSkills = await getZPDSkills(notebookId, masteredSkillIds)

    return NextResponse.json({
      available: true,
      learningPath: {
        ...learningPath,
        path: optimizedPath,
      },
      zpdSkills: zpdSkills.slice(0, 5), // Top 5 recommended next skills
      recommendations: {
        nextSkill: zpdSkills[0]?.skill || null,
        thresholdConceptsAhead: learningPath.thresholdConcepts.length,
        estimatedHours: Math.round(learningPath.totalEstimatedMinutes / 60),
      },
    })
  } catch (error) {
    console.error('Error generating learning path:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
