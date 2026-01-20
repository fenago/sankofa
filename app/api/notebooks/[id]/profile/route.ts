import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNeo4JAvailable } from '@/lib/graph/neo4j'
import {
  InverseProfileEngine,
  generateProfileInsights,
  type ProfileComputationResult,
} from '@/lib/profile/inverse-profile-engine'
import type {
  LearnerInteraction,
  LearnerSession,
  InverseProfile,
} from '@/lib/types/interactions'
import type { InverseProfileInsert } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/notebooks/[id]/profile - Get learner's inverse profile
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook exists
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    const action = searchParams.get('action') || 'get'
    const learnerId = user.id

    switch (action) {
      case 'get': {
        // Get stored profile
        const { data: profile, error } = await supabase
          .from('inverse_profiles')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        // Count interactions since last update
        let interactionsSinceUpdate = 0
        if (profile?.computed_at) {
          const { count } = await supabase
            .from('learner_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('notebook_id', notebookId)
            .eq('learner_id', learnerId)
            .gt('created_at', profile.computed_at)

          interactionsSinceUpdate = count ?? 0
        } else {
          const { count } = await supabase
            .from('learner_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('notebook_id', notebookId)
            .eq('learner_id', learnerId)

          interactionsSinceUpdate = count ?? 0
        }

        return NextResponse.json({
          available: true,
          hasProfile: !!profile,
          profile: profile || null,
          lastUpdated: profile?.computed_at || null,
          interactionsSinceUpdate,
          needsUpdate: interactionsSinceUpdate >= 10, // Suggest update after 10 new interactions
        })
      }

      case 'insights': {
        // Get profile and generate insights
        const { data: profile } = await supabase
          .from('inverse_profiles')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .single()

        if (!profile) {
          return NextResponse.json({
            available: true,
            hasProfile: false,
            message: 'No profile available. Compute profile first.',
            insights: [],
          })
        }

        // Convert to InverseProfile type (cast Json fields)
        const inverseProfile: InverseProfile = {
          id: profile.id,
          learner_id: profile.learner_id,
          notebook_id: profile.notebook_id,
          version: profile.version,
          computed_at: profile.computed_at,
          interactions_analyzed: profile.interactions_analyzed,
          knowledge_state: profile.knowledge_state as unknown as InverseProfile['knowledge_state'],
          cognitive_indicators: profile.cognitive_indicators as unknown as InverseProfile['cognitive_indicators'],
          metacognitive_indicators: profile.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators'],
          motivational_indicators: profile.motivational_indicators as unknown as InverseProfile['motivational_indicators'],
          behavioral_patterns: profile.behavioral_patterns as unknown as InverseProfile['behavioral_patterns'],
          confidence_scores: profile.confidence_scores as unknown as InverseProfile['confidence_scores'],
        }

        const insights = generateProfileInsights(inverseProfile)

        return NextResponse.json({
          available: true,
          hasProfile: true,
          insights,
          profileVersion: profile.version,
          dataQuality: profile.data_quality,
        })
      }

      case 'summary': {
        // Get a compact summary of the profile
        const { data: profile } = await supabase
          .from('inverse_profiles')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .single()

        if (!profile) {
          return NextResponse.json({
            available: true,
            hasProfile: false,
            summary: null,
          })
        }

        // Cast JSON fields to proper types
        const ks = profile.knowledge_state as unknown as InverseProfile['knowledge_state']
        const ci = profile.cognitive_indicators as unknown as InverseProfile['cognitive_indicators']
        const mi = profile.metacognitive_indicators as unknown as InverseProfile['metacognitive_indicators']
        const moi = profile.motivational_indicators as unknown as InverseProfile['motivational_indicators']
        const cs = profile.confidence_scores as unknown as InverseProfile['confidence_scores']

        const summary = {
          overallMastery: ks.averageMastery,
          expertiseLevel: ci.expertiseLevel,
          helpSeekingPattern: mi.helpSeekingPattern,
          goalOrientation: moi.goalOrientation,
          dataQuality: profile.data_quality,
          confidence: {
            overall: (cs.knowledge + cs.cognitive + cs.metacognitive + cs.motivational + cs.behavioral) / 5,
            ...cs,
          },
          keyStats: {
            skillsMastered: ks.skillsMastered,
            skillsInProgress: ks.skillsInProgress,
            knowledgeGaps: ks.knowledgeGaps.length,
            misconceptions: ks.misconceptions.length,
          },
          lastUpdated: profile.computed_at,
        }

        return NextResponse.json({
          available: true,
          hasProfile: true,
          summary,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notebooks/[id]/profile - Compute/recompute profile
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: notebookId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify notebook exists
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single()

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 })
    }

    // Check Neo4J availability for knowledge state
    const neo4jAvailable = isNeo4JAvailable()

    const body = await request.json()
    const { action = 'compute', force = false } = body
    const learnerId = user.id

    switch (action) {
      case 'compute': {
        // Check if we need to recompute
        if (!force) {
          const { data: existingProfile } = await supabase
            .from('inverse_profiles')
            .select('computed_at')
            .eq('notebook_id', notebookId)
            .eq('learner_id', learnerId)
            .single()

          if (existingProfile) {
            // Check interactions since last update
            const { count } = await supabase
              .from('learner_interactions')
              .select('*', { count: 'exact', head: true })
              .eq('notebook_id', notebookId)
              .eq('learner_id', learnerId)
              .gt('created_at', existingProfile.computed_at)

            const interactionsSinceUpdate = count ?? 0

            if (interactionsSinceUpdate < 5) {
              return NextResponse.json({
                available: true,
                computed: false,
                message: 'Profile is up to date. Use force=true to recompute.',
                interactionsSinceUpdate,
              })
            }
          }
        }

        // Fetch all interactions
        const { data: interactions, error: intError } = await supabase
          .from('learner_interactions')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .order('created_at', { ascending: true })

        if (intError) throw intError

        // Fetch all sessions
        const { data: sessions, error: sessError } = await supabase
          .from('learner_sessions')
          .select('*')
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)
          .order('started_at', { ascending: true })

        if (sessError) throw sessError

        // Check minimum data requirements
        if (!interactions || interactions.length === 0) {
          return NextResponse.json({
            available: true,
            computed: false,
            message: 'No interaction data available for profile computation.',
            dataQuality: 'insufficient',
          })
        }

        // Compute profile using the engine
        const engine = new InverseProfileEngine({
          notebookId,
          learnerId,
        })

        engine.loadData(
          interactions as unknown as LearnerInteraction[],
          (sessions || []) as unknown as LearnerSession[]
        )

        let result: ProfileComputationResult

        if (neo4jAvailable) {
          result = await engine.computeProfile()
        } else {
          // Compute without Neo4J knowledge state
          result = await engine.computeProfile()
          result.warnings.push('Neo4J not available - knowledge state may be incomplete')
        }

        // Store the computed profile (cast to Supabase insert type)
        const profileData: InverseProfileInsert = {
          notebook_id: notebookId,
          learner_id: learnerId,
          computed_at: result.profile.computed_at,
          interactions_analyzed: result.profile.interactions_analyzed,
          knowledge_state: JSON.parse(JSON.stringify(result.profile.knowledge_state)),
          cognitive_indicators: JSON.parse(JSON.stringify(result.profile.cognitive_indicators)),
          metacognitive_indicators: JSON.parse(JSON.stringify(result.profile.metacognitive_indicators)),
          motivational_indicators: JSON.parse(JSON.stringify(result.profile.motivational_indicators)),
          behavioral_patterns: JSON.parse(JSON.stringify(result.profile.behavioral_patterns)),
          confidence_scores: JSON.parse(JSON.stringify(result.profile.confidence_scores)),
          data_quality: result.dataQuality,
          warnings: result.warnings,
        }

        const { data: savedProfile, error: saveError } = await supabase
          .from('inverse_profiles')
          .upsert(profileData, {
            onConflict: 'notebook_id,learner_id',
          })
          .select()
          .single()

        if (saveError) throw saveError

        // Generate insights
        const insights = generateProfileInsights(result.profile)

        return NextResponse.json({
          available: true,
          computed: true,
          profile: savedProfile,
          dataQuality: result.dataQuality,
          warnings: result.warnings,
          insights: insights.slice(0, 5), // Top 5 insights
        })
      }

      case 'delete': {
        // Delete profile
        const { error } = await supabase
          .from('inverse_profiles')
          .delete()
          .eq('notebook_id', notebookId)
          .eq('learner_id', learnerId)

        if (error) throw error

        return NextResponse.json({
          available: true,
          deleted: true,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error computing profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
