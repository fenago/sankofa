/**
 * Learner Interaction Types
 *
 * Types for capturing all learner events for Inverse Profiling and analytics.
 * These events are stored in Supabase for pattern analysis and profile inference.
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

export type InteractionEventType =
  // Practice Events
  | 'practice_attempt'
  | 'practice_skipped'
  | 'hint_requested'
  | 'hint_viewed'
  | 'solution_revealed'
  // Navigation Events
  | 'skill_viewed'
  | 'skill_selected'
  | 'path_changed'
  // Content Events
  | 'artifact_generated'
  | 'artifact_viewed'
  | 'source_accessed'
  | 'chat_message'
  // Assessment Events
  | 'assessment_started'
  | 'assessment_completed'
  | 'confidence_rated'
  // Session Events
  | 'session_started'
  | 'session_ended'
  | 'session_paused'
  | 'session_resumed'
  // Socratic Mode Events
  | 'socratic_dialogue_started'
  | 'socratic_exchange'
  | 'socratic_discovery'
  | 'socratic_dialogue_completed';

// ============================================================================
// EVENT PAYLOADS (specific data for each event type)
// ============================================================================

export interface PracticeAttemptPayload {
  questionId: string;
  questionType: 'multiple_choice' | 'free_response' | 'true_false' | 'fill_blank';
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer?: string;
  responseTimeMs: number;
  hintUsedCount: number;
  attemptNumber: number;
  difficulty?: number; // 0-1 scale
}

export interface PracticeSkippedPayload {
  questionId: string;
  questionType: string;
  timeBeforeSkipMs: number;
  reason?: 'too_hard' | 'not_relevant' | 'already_know' | 'unknown';
}

export interface HintRequestedPayload {
  questionId: string;
  hintNumber: number;
  totalHintsAvailable: number;
  timeBeforeHintMs: number;
}

export interface HintViewedPayload {
  questionId: string;
  hintNumber: number;
  viewDurationMs: number;
}

export interface SolutionRevealedPayload {
  questionId: string;
  attemptsMade: number;
  timeBeforeRevealMs: number;
}

export interface SkillViewedPayload {
  viewDurationMs?: number;
  scrollDepth?: number; // 0-1 percentage
  previousSkillId?: string;
}

export interface SkillSelectedPayload {
  selectionMethod: 'click' | 'search' | 'recommendation' | 'zpd';
  fromLocation: 'graph' | 'list' | 'path' | 'search';
}

export interface PathChangedPayload {
  previousPath: string[];
  newPath: string[];
  reason: 'user_choice' | 'recommendation' | 'prerequisite_complete';
}

export interface ArtifactGeneratedPayload {
  artifactType: string;
  toolId: string;
  audience: 'student' | 'teacher' | 'curriculum';
  generationTimeMs: number;
}

export interface ArtifactViewedPayload {
  artifactId: string;
  artifactType: string;
  viewDurationMs: number;
  downloadedOrSaved?: boolean;
}

export interface SourceAccessedPayload {
  sourceId: string;
  sourceType: 'url' | 'pdf' | 'txt';
  accessMethod: 'direct' | 'from_chat' | 'from_artifact';
}

export interface ChatMessagePayload {
  messageLength: number;
  isQuestion: boolean;
  topicsReferenced: string[];
  contextChunksUsed: number;
}

export interface AssessmentStartedPayload {
  assessmentType: 'diagnostic' | 'formative' | 'summative';
  totalQuestions: number;
  skillsCovered: string[];
}

export interface AssessmentCompletedPayload {
  assessmentType: 'diagnostic' | 'formative' | 'summative';
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-1
  timeSpentMs: number;
  skillResults: Record<string, { correct: number; total: number }>;
}

export interface ConfidenceRatedPayload {
  ratingType: 'pre_attempt' | 'post_attempt' | 'self_assessment';
  rating: number; // 1-5 or 0-1 depending on scale
  scale: '1-5' | '0-1';
  actualOutcome?: boolean; // If this was pre-attempt confidence
}

export interface SessionStartedPayload {
  entryPoint: 'direct' | 'notification' | 'email' | 'bookmark';
  returningSameDay: boolean;
  daysSinceLastSession?: number;
}

export interface SessionEndedPayload {
  endReason: 'explicit' | 'idle_timeout' | 'page_close' | 'navigation_away';
  finalSkillId?: string;
  practiceStreak: number;
}

export interface SessionPausedPayload {
  pauseReason: 'tab_hidden' | 'idle' | 'explicit';
}

export interface SessionResumedPayload {
  pauseDurationMs: number;
}

// Socratic Mode Event Payloads
export interface SocraticDialogueStartedPayload {
  dialogueId: string;
  targetConcept: string;
  openingQuestionType: 'clarifying' | 'probing' | 'scaffolding' | 'challenging' | 'reflection' | 'metacognitive';
  adaptiveConfigSummary: {
    scaffoldLevel: number;
    questionStyle: 'challenging' | 'supportive' | 'neutral';
    abstractionLevel: 'concrete' | 'abstract' | 'balanced';
  };
}

export interface SocraticExchangePayload {
  dialogueId: string;
  exchangeNumber: number;
  questionType: 'clarifying' | 'probing' | 'scaffolding' | 'challenging' | 'reflection' | 'metacognitive';
  tutorQuestion: string;
  learnerResponse: string;
  responseLatencyMs: number;
  // Extracted psychometrics summary
  extractedPsychometrics: {
    explanationQuality: number;
    hedgingRate: number;
    certaintyRate: number;
    selfCorrectionCount: number;
    engagementLevel: 'high' | 'medium' | 'low';
    reasoningStyle: 'deductive' | 'inductive' | 'mixed';
  };
  understandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer';
  ledToDiscovery: boolean;
  misconceptionsDetected: string[];
}

export interface SocraticDiscoveryPayload {
  dialogueId: string;
  exchangeNumber: number;
  discoveryDescription: string;
  insightsDetected: string[];
  triggerQuestion: string;
  understandingBeforeDiscovery: 'none' | 'surface' | 'partial';
  understandingAfterDiscovery: 'deep' | 'transfer';
}

export interface SocraticDialogueCompletedPayload {
  dialogueId: string;
  totalExchanges: number;
  discoveryAchieved: boolean;
  finalUnderstandingLevel: 'none' | 'surface' | 'partial' | 'deep' | 'transfer';
  effectivenessScore: number;
  durationMs: number;
  // Aggregated psychometrics
  aggregatedPsychometrics: {
    avgExplanationQuality: number;
    avgHedgingRate: number;
    avgCertaintyRate: number;
    totalSelfCorrections: number;
    totalInsights: number;
    calibrationAccuracy: number;
    dominantReasoningStyle: 'deductive' | 'inductive' | 'mixed';
    overallEngagement: 'high' | 'medium' | 'low';
  };
  keyInsights: string[];
  misconceptionsIdentified: string[];
  // Profile update summary
  profileUpdates: {
    masteryAdjustment: number;
    newMisconceptions: string[];
  };
}

// Union type for all payloads
export type InteractionPayload =
  | PracticeAttemptPayload
  | PracticeSkippedPayload
  | HintRequestedPayload
  | HintViewedPayload
  | SolutionRevealedPayload
  | SkillViewedPayload
  | SkillSelectedPayload
  | PathChangedPayload
  | ArtifactGeneratedPayload
  | ArtifactViewedPayload
  | SourceAccessedPayload
  | ChatMessagePayload
  | AssessmentStartedPayload
  | AssessmentCompletedPayload
  | ConfidenceRatedPayload
  | SessionStartedPayload
  | SessionEndedPayload
  | SessionPausedPayload
  | SessionResumedPayload
  | SocraticDialogueStartedPayload
  | SocraticExchangePayload
  | SocraticDiscoveryPayload
  | SocraticDialogueCompletedPayload
  | Record<string, unknown>; // Fallback for extensibility

// ============================================================================
// CONTEXT (session/device information)
// ============================================================================

export interface InteractionContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6, Sunday = 0
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth?: number;
  screenHeight?: number;
  userAgent?: string;
  timezone?: string;
  locale?: string;
}

// ============================================================================
// DATABASE TYPES (matching Supabase schema)
// ============================================================================

export interface LearnerInteraction {
  id: string;
  notebook_id: string;
  learner_id: string;
  skill_id: string | null;
  event_type: InteractionEventType;
  session_id: string;
  created_at: string;
  session_duration_ms: number | null;
  time_since_last_ms: number | null;
  payload: InteractionPayload;
  context: InteractionContext;
}

export interface LearnerInteractionInsert {
  id?: string;
  notebook_id: string;
  learner_id: string;
  skill_id?: string | null;
  event_type: InteractionEventType;
  session_id: string;
  created_at?: string;
  session_duration_ms?: number | null;
  time_since_last_ms?: number | null;
  payload?: InteractionPayload;
  context?: InteractionContext;
}

export type SessionStatus = 'active' | 'ended' | 'abandoned';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface LearnerSession {
  id: string;
  notebook_id: string;
  learner_id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  total_interactions: number;
  practice_attempts: number;
  correct_attempts: number;
  hints_requested: number;
  skills_practiced: string[];
  ending_mastery_snapshot: Record<string, number> | null;
  device_type: DeviceType | null;
  user_agent: string | null;
  status: SessionStatus;
}

export interface LearnerSessionInsert {
  id?: string;
  notebook_id: string;
  learner_id: string;
  started_at?: string;
  ended_at?: string | null;
  duration_ms?: number | null;
  total_interactions?: number;
  practice_attempts?: number;
  correct_attempts?: number;
  hints_requested?: number;
  skills_practiced?: string[];
  ending_mastery_snapshot?: Record<string, number> | null;
  device_type?: DeviceType | null;
  user_agent?: string | null;
  status?: SessionStatus;
}

// ============================================================================
// INVERSE PROFILE TYPES
// ============================================================================

export type ExpertiseLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type WorkingMemoryIndicator = 'low' | 'medium' | 'high' | 'unknown';
export type HelpSeekingPattern = 'avoidant' | 'appropriate' | 'excessive' | 'unknown';
export type GoalOrientation = 'mastery' | 'performance' | 'avoidance' | 'unknown';

export interface KnowledgeState {
  averageMastery: number;
  skillsMastered: number;
  skillsInProgress: number;
  skillsNotStarted: number;
  knowledgeGaps: string[];
  misconceptions: string[];
  currentZPD: string[];
}

export interface CognitiveIndicators {
  workingMemoryIndicator: WorkingMemoryIndicator;
  expertiseLevel: ExpertiseLevel;
  cognitiveLoadThreshold: number | null;
  optimalComplexityLevel: number | null;
  averageResponseTimeMs: number | null;
}

export interface MetacognitiveIndicators {
  calibrationAccuracy: number | null; // Correlation between confidence and performance
  helpSeekingPattern: HelpSeekingPattern;
  selfMonitoringAccuracy: number | null;
  overconfidenceRate: number | null;
  underconfidenceRate: number | null;
}

export interface MotivationalIndicators {
  sessionFrequency: number | null; // Sessions per week
  averageSessionDuration: number | null; // Minutes
  voluntaryReturnRate: number | null;
  persistenceScore: number | null;
  goalOrientation: GoalOrientation;
}

export interface BehavioralPatterns {
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  mostActiveDay: number | null; // 0-6, Sunday = 0
  averageResponseTime: number | null;
  hintUsageRate: number | null;
  errorPatterns: string[];
  learningVelocity: number | null; // Skills per week
}

export interface ConfidenceScores {
  knowledge: number;
  cognitive: number;
  metacognitive: number;
  motivational: number;
  behavioral: number;
}

export interface InverseProfile {
  id: string;
  learner_id: string;
  notebook_id: string;
  version: number;
  computed_at: string;
  interactions_analyzed: number;
  knowledge_state: KnowledgeState;
  cognitive_indicators: CognitiveIndicators;
  metacognitive_indicators: MetacognitiveIndicators;
  motivational_indicators: MotivationalIndicators;
  behavioral_patterns: BehavioralPatterns;
  confidence_scores: ConfidenceScores;
}

export interface InverseProfileInsert {
  id?: string;
  learner_id: string;
  notebook_id: string;
  version?: number;
  computed_at?: string;
  interactions_analyzed?: number;
  knowledge_state?: Partial<KnowledgeState>;
  cognitive_indicators?: Partial<CognitiveIndicators>;
  metacognitive_indicators?: Partial<MetacognitiveIndicators>;
  motivational_indicators?: Partial<MotivationalIndicators>;
  behavioral_patterns?: Partial<BehavioralPatterns>;
  confidence_scores?: Partial<ConfidenceScores>;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface RecordInteractionRequest {
  event_type: InteractionEventType;
  skill_id?: string;
  session_id: string;
  payload?: InteractionPayload;
  context?: Partial<InteractionContext>;
}

export interface RecordInteractionResponse {
  success: boolean;
  interaction_id: string;
  session_updated: boolean;
}

export interface StartSessionRequest {
  device_type?: DeviceType;
  user_agent?: string;
  entry_point?: 'direct' | 'notification' | 'email' | 'bookmark';
}

export interface StartSessionResponse {
  session_id: string;
  started_at: string;
  returning_same_day: boolean;
  days_since_last_session?: number;
}

export interface EndSessionRequest {
  session_id: string;
  end_reason?: 'explicit' | 'idle_timeout' | 'page_close' | 'navigation_away';
  final_skill_id?: string;
}

export interface EndSessionResponse {
  success: boolean;
  session_summary: {
    duration_ms: number;
    total_interactions: number;
    practice_attempts: number;
    correct_attempts: number;
    accuracy: number;
    skills_practiced: string[];
  };
}

export interface GetInteractionsRequest {
  event_type?: InteractionEventType;
  skill_id?: string;
  session_id?: string;
  since?: string; // ISO date
  limit?: number;
  offset?: number;
}

export interface GetInteractionsResponse {
  interactions: LearnerInteraction[];
  total_count: number;
  has_more: boolean;
}

export interface GetSessionsRequest {
  status?: SessionStatus;
  since?: string;
  limit?: number;
}

export interface GetSessionsResponse {
  sessions: LearnerSession[];
  total_count: number;
}

export interface GetProfileResponse {
  profile: InverseProfile | null;
  last_updated: string | null;
  interactions_since_update: number;
}
