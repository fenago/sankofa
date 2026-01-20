export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Notebook settings for inverse profiling and BKT configuration
export interface BKTParameters {
  use_skill_specific: boolean
  default_pL0: number // Initial probability of knowing (0-1)
  default_pT: number  // Probability of learning from attempt (0-1)
  default_pS: number  // Probability of slip - knows but fails (0-1)
  default_pG: number  // Probability of guess - doesn't know but succeeds (0-1)
}

export interface NotebookSettings {
  inverse_profiling_enabled: boolean
  session_tracking_enabled: boolean
  interaction_logging_enabled: boolean
  bkt_parameters: BKTParameters
}

export const DEFAULT_NOTEBOOK_SETTINGS: NotebookSettings = {
  inverse_profiling_enabled: true,
  session_tracking_enabled: true,
  interaction_logging_enabled: true,
  bkt_parameters: {
    use_skill_specific: false,
    default_pL0: 0.3,
    default_pT: 0.1,
    default_pS: 0.1,
    default_pG: 0.2,
  },
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string | null
          settings: NotebookSettings | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string | null
          settings?: NotebookSettings | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string | null
          settings?: NotebookSettings | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          notebook_id: string
          user_id: string
          source_type: 'url' | 'pdf' | 'txt'
          url: string | null
          title: string | null
          filename: string | null
          status: 'pending' | 'processing' | 'success' | 'error'
          raw_text: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          user_id: string
          source_type: 'url' | 'pdf' | 'txt'
          url?: string | null
          title?: string | null
          filename?: string | null
          status?: 'pending' | 'processing' | 'success' | 'error'
          raw_text?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          user_id?: string
          source_type?: 'url' | 'pdf' | 'txt'
          url?: string | null
          title?: string | null
          filename?: string | null
          status?: 'pending' | 'processing' | 'success' | 'error'
          raw_text?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      chunks: {
        Row: {
          id: string
          source_id: string
          notebook_id: string
          content: string
          chunk_index: number
          embedding: number[] | null
          token_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source_id: string
          notebook_id: string
          content: string
          chunk_index: number
          embedding?: number[] | null
          token_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source_id?: string
          notebook_id?: string
          content?: string
          chunk_index?: number
          embedding?: number[] | null
          token_count?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          notebook_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          context_chunk_ids: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          context_chunk_ids?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          context_chunk_ids?: string[] | null
          created_at?: string | null
        }
        Relationships: []
      }
      artifacts: {
        Row: {
          id: string
          notebook_id: string
          user_id: string
          skill_name: string
          skill_description: string | null
          artifact_type: string
          audience: 'student' | 'teacher' | 'curriculum'
          tool_id: string
          image_data: string
          text_content: string | null
          model_used: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          user_id: string
          skill_name: string
          skill_description?: string | null
          artifact_type: string
          audience: 'student' | 'teacher' | 'curriculum'
          tool_id: string
          image_data: string
          text_content?: string | null
          model_used?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          user_id?: string
          skill_name?: string
          skill_description?: string | null
          artifact_type?: string
          audience?: 'student' | 'teacher' | 'curriculum'
          tool_id?: string
          image_data?: string
          text_content?: string | null
          model_used?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      prompt_overrides: {
        Row: {
          id: string
          notebook_id: string
          user_id: string
          audience: 'student' | 'teacher' | 'curriculum'
          tool_id: string
          artifact_id: string
          custom_prompt: string
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          user_id: string
          audience: 'student' | 'teacher' | 'curriculum'
          tool_id: string
          artifact_id: string
          custom_prompt: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          user_id?: string
          audience?: 'student' | 'teacher' | 'curriculum'
          tool_id?: string
          artifact_id?: string
          custom_prompt?: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learner_interactions: {
        Row: {
          id: string
          notebook_id: string
          learner_id: string
          skill_id: string | null
          event_type: string
          session_id: string
          created_at: string
          session_duration_ms: number | null
          time_since_last_ms: number | null
          payload: Json
          context: Json
        }
        Insert: {
          id?: string
          notebook_id: string
          learner_id: string
          skill_id?: string | null
          event_type: string
          session_id: string
          created_at?: string
          session_duration_ms?: number | null
          time_since_last_ms?: number | null
          payload?: Json
          context?: Json
        }
        Update: {
          id?: string
          notebook_id?: string
          learner_id?: string
          skill_id?: string | null
          event_type?: string
          session_id?: string
          created_at?: string
          session_duration_ms?: number | null
          time_since_last_ms?: number | null
          payload?: Json
          context?: Json
        }
        Relationships: []
      }
      learner_sessions: {
        Row: {
          id: string
          notebook_id: string
          learner_id: string
          started_at: string
          ended_at: string | null
          duration_ms: number | null
          total_interactions: number
          practice_attempts: number
          correct_attempts: number
          hints_requested: number
          skills_practiced: string[]
          ending_mastery_snapshot: Json | null
          device_type: string | null
          user_agent: string | null
          status: 'active' | 'ended' | 'abandoned'
        }
        Insert: {
          id?: string
          notebook_id: string
          learner_id: string
          started_at?: string
          ended_at?: string | null
          duration_ms?: number | null
          total_interactions?: number
          practice_attempts?: number
          correct_attempts?: number
          hints_requested?: number
          skills_practiced?: string[]
          ending_mastery_snapshot?: Json | null
          device_type?: string | null
          user_agent?: string | null
          status?: 'active' | 'ended' | 'abandoned'
        }
        Update: {
          id?: string
          notebook_id?: string
          learner_id?: string
          started_at?: string
          ended_at?: string | null
          duration_ms?: number | null
          total_interactions?: number
          practice_attempts?: number
          correct_attempts?: number
          hints_requested?: number
          skills_practiced?: string[]
          ending_mastery_snapshot?: Json | null
          device_type?: string | null
          user_agent?: string | null
          status?: 'active' | 'ended' | 'abandoned'
        }
        Relationships: []
      }
      inverse_profiles: {
        Row: {
          id: string
          learner_id: string
          notebook_id: string
          version: number
          computed_at: string
          interactions_analyzed: number
          knowledge_state: Json
          cognitive_indicators: Json
          metacognitive_indicators: Json
          motivational_indicators: Json
          behavioral_patterns: Json
          confidence_scores: Json
        }
        Insert: {
          id?: string
          learner_id: string
          notebook_id: string
          version?: number
          computed_at?: string
          interactions_analyzed?: number
          knowledge_state?: Json
          cognitive_indicators?: Json
          metacognitive_indicators?: Json
          motivational_indicators?: Json
          behavioral_patterns?: Json
          confidence_scores?: Json
        }
        Update: {
          id?: string
          learner_id?: string
          notebook_id?: string
          version?: number
          computed_at?: string
          interactions_analyzed?: number
          knowledge_state?: Json
          cognitive_indicators?: Json
          metacognitive_indicators?: Json
          motivational_indicators?: Json
          behavioral_patterns?: Json
          confidence_scores?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: number[]
          p_notebook_id: string
          match_count?: number
          similarity_threshold?: number
        }
        Returns: {
          id: string
          source_id: string
          content: string
          chunk_index: number
          similarity: number
        }[]
      }
      get_active_session: {
        Args: {
          p_learner_id: string
          p_notebook_id: string
        }
        Returns: string | null
      }
      get_interaction_summary: {
        Args: {
          p_learner_id: string
          p_notebook_id: string
          p_since?: string
        }
        Returns: {
          event_type: string
          event_count: number
        }[]
      }
      get_practice_stats: {
        Args: {
          p_learner_id: string
          p_notebook_id: string
          p_skill_id?: string
        }
        Returns: {
          total_attempts: number
          correct_attempts: number
          accuracy: number
          avg_response_time_ms: number
          hints_used: number
        }[]
      }
    }
    Enums: {
      source_type: 'url' | 'pdf' | 'txt'
      source_status: 'pending' | 'processing' | 'success' | 'error'
      session_status: 'active' | 'ended' | 'abandoned'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Notebook = Database['public']['Tables']['notebooks']['Row']
export type Source = Database['public']['Tables']['sources']['Row']
export type Chunk = Database['public']['Tables']['chunks']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Artifact = Database['public']['Tables']['artifacts']['Row']
export type PromptOverride = Database['public']['Tables']['prompt_overrides']['Row']

export type NotebookInsert = Database['public']['Tables']['notebooks']['Insert']
export type SourceInsert = Database['public']['Tables']['sources']['Insert']
export type ChunkInsert = Database['public']['Tables']['chunks']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type ArtifactInsert = Database['public']['Tables']['artifacts']['Insert']
export type PromptOverrideInsert = Database['public']['Tables']['prompt_overrides']['Insert']
export type LearnerInteractionRow = Database['public']['Tables']['learner_interactions']['Row']
export type LearnerInteractionInsert = Database['public']['Tables']['learner_interactions']['Insert']
export type LearnerSessionRow = Database['public']['Tables']['learner_sessions']['Row']
export type LearnerSessionInsert = Database['public']['Tables']['learner_sessions']['Insert']
export type InverseProfileRow = Database['public']['Tables']['inverse_profiles']['Row']
export type InverseProfileInsert = Database['public']['Tables']['inverse_profiles']['Insert']

export type SourceType = Database['public']['Enums']['source_type']
export type SourceStatus = Database['public']['Enums']['source_status']
export type SessionStatus = Database['public']['Enums']['session_status']
