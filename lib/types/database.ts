export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string | null
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
    }
    Enums: {
      source_type: 'url' | 'pdf' | 'txt'
      source_status: 'pending' | 'processing' | 'success' | 'error'
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

export type NotebookInsert = Database['public']['Tables']['notebooks']['Insert']
export type SourceInsert = Database['public']['Tables']['sources']['Insert']
export type ChunkInsert = Database['public']['Tables']['chunks']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

export type SourceType = Database['public']['Enums']['source_type']
export type SourceStatus = Database['public']['Enums']['source_status']
