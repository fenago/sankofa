/**
 * Socratic Mode Module
 *
 * Free-form conversational practice mode for extracting rich psychometric
 * data from dialogue patterns.
 */

// Core extraction engine
export {
  extractFromResponse,
  aggregatePsychometrics,
  detectHedgingLanguage,
  detectCertaintyMarkers,
  detectSelfCorrections,
  detectMetacognition,
  classifyReasoningStyle,
  measureAbstractionLevel,
  detectEngagement,
  analyzeCommmunication,
  assessExplanationQuality,
  detectMisconceptions,
  detectInsights,
  type ExtractionResult,
  type DialogueContext,
  type UnderstandingIndicators,
  type ConfidenceIndicators,
  type MetacognitionIndicators,
  type ReasoningIndicators,
  type EngagementIndicators,
  type CommunicationIndicators,
  type AggregatedPsychometrics,
} from './psychometric-extractor'

// Adaptive response generation
export {
  buildAdaptiveConfig,
  adaptQuestionComplexity,
  adaptScaffolding,
  adaptForCalibration,
  adaptMetacognitivePrompts,
  adaptForEngagement,
  selectQuestionType,
  generateAdaptiveSystemPrompt,
  generateFollowUpPrompt,
  checkForInterventions,
  createDefaultSocraticProfile,
  type SocraticProfile,
  type SessionState,
  type AdaptiveConfig,
  type QuestionConfig,
  type ScaffoldingConfig,
  type CalibrationConfig,
  type MetacognitiveConfig,
  type EngagementConfig,
  type SocraticIntervention,
} from './adaptive-generator'

// Profile updates
export {
  updateProfileFromSocraticDialogue,
  updateInverseProfileFromDialogue,
  updateSocraticProfileFromDialogue,
  calculateMasteryAdjustment,
  serializeSocraticProfile,
  deserializeSocraticProfile,
  type DialogueResults,
  type ProfileUpdateResult,
} from './profile-updater'

// Dialogue management
export {
  startDialogue,
  processExchange,
  completeDialogue,
  abandonDialogue,
  getDialogueSummary,
  type SocraticDialogue,
  type StartDialogueParams,
  type StartDialogueResult,
  type ExchangeParams,
  type ExchangeResult,
  type CompleteDialogueResult,
  type DialogueSummary,
} from './dialogue-manager'

// Inverse Socratic Mode (Learning by Teaching)
export {
  initializeInverseSocratic,
  generateOpeningPrompt,
  extractTeachingPsychometrics,
  classifyUserRole,
  determineAILearnerRole,
  generateLearnerSystemPrompt,
  updateTeachingMetrics,
  updateLearnerUnderstanding,
  generateInverseSocraticSummary,
  type InverseSocraticConfig,
  type InverseSocraticState,
  type InverseExchange,
  type TeachingPsychometrics,
  type TeachingMetrics,
  type LearnerPersona,
  type LearnerPromptConfig,
} from './inverse-socratic'

// Freeform Tutoring Mode (User-driven Q&A)
export {
  initializeFreeformDialogue,
  generateWelcomeMessage,
  classifyUserIntent,
  extractConversationalPsychometrics,
  determineAIResponseType,
  generateStrategicElement,
  generateTutorSystemPrompt,
  updateConversationMetrics,
  generateFreeformSummary,
  type FreeformConfig,
  type FreeformState,
  type FreeformExchange,
  type LearnerProfile,
  type UserIntent,
  type AIResponseType,
  type StrategicElement,
  type ConversationalPsychometrics,
  type ConversationMetrics,
  type FreeformDialogueSummary,
} from './freeform-tutor'
