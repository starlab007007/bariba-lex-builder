export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_training_context: {
        Row: {
          created_at: string | null
          created_by: string | null
          dictionary_count: number
          id: string
          metrics: Json | null
          model_version: string
          phrases_count: number
          training_data: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dictionary_count?: number
          id?: string
          metrics?: Json | null
          model_version: string
          phrases_count?: number
          training_data?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dictionary_count?: number
          id?: string
          metrics?: Json | null
          model_version?: string
          phrases_count?: number
          training_data?: Json | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          points_reward: number | null
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Insert: {
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          points_reward?: number | null
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          points_reward?: number | null
          requirement_type?: string
          requirement_value?: number
          tier?: string
        }
        Relationships: []
      }
      dictionary_enrichments: {
        Row: {
          applied: boolean | null
          confidence_score: number | null
          created_at: string | null
          enrichment_type: string
          entry_id: string
          field_name: string
          id: string
          source_data: Json | null
          suggested_value: string | null
        }
        Insert: {
          applied?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          enrichment_type: string
          entry_id: string
          field_name: string
          id?: string
          source_data?: Json | null
          suggested_value?: string | null
        }
        Update: {
          applied?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          enrichment_type?: string
          entry_id?: string
          field_name?: string
          id?: string
          source_data?: Json | null
          suggested_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_enrichments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      dictionary_entries: {
        Row: {
          accomplished_form: string | null
          adjective_forms: Json | null
          benefactive_form: string | null
          created_at: string | null
          created_by: string | null
          cross_reference: string | null
          definition: string
          derivational_suffixes: string[] | null
          example_bariba: string[] | null
          example_francais: string[] | null
          french_keywords: string[] | null
          grammatical_notes: string | null
          id: string
          is_main_entry: boolean | null
          is_verified: boolean | null
          low_tone_optional: boolean | null
          negative_form: string | null
          nominal_class: string | null
          part_of_speech: string | null
          phonetic: string | null
          plural_class: string | null
          plural_form: string | null
          quality_score: number | null
          tone_pattern: string | null
          updated_at: string | null
          updated_by: string | null
          usage_context: string | null
          variants: string[] | null
          verb_radical: string | null
          verb_root: string | null
          verb_type: string | null
          verbal_group: number | null
          word: string
        }
        Insert: {
          accomplished_form?: string | null
          adjective_forms?: Json | null
          benefactive_form?: string | null
          created_at?: string | null
          created_by?: string | null
          cross_reference?: string | null
          definition: string
          derivational_suffixes?: string[] | null
          example_bariba?: string[] | null
          example_francais?: string[] | null
          french_keywords?: string[] | null
          grammatical_notes?: string | null
          id?: string
          is_main_entry?: boolean | null
          is_verified?: boolean | null
          low_tone_optional?: boolean | null
          negative_form?: string | null
          nominal_class?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          plural_class?: string | null
          plural_form?: string | null
          quality_score?: number | null
          tone_pattern?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_context?: string | null
          variants?: string[] | null
          verb_radical?: string | null
          verb_root?: string | null
          verb_type?: string | null
          verbal_group?: number | null
          word: string
        }
        Update: {
          accomplished_form?: string | null
          adjective_forms?: Json | null
          benefactive_form?: string | null
          created_at?: string | null
          created_by?: string | null
          cross_reference?: string | null
          definition?: string
          derivational_suffixes?: string[] | null
          example_bariba?: string[] | null
          example_francais?: string[] | null
          french_keywords?: string[] | null
          grammatical_notes?: string | null
          id?: string
          is_main_entry?: boolean | null
          is_verified?: boolean | null
          low_tone_optional?: boolean | null
          negative_form?: string | null
          nominal_class?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          plural_class?: string | null
          plural_form?: string | null
          quality_score?: number | null
          tone_pattern?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usage_context?: string | null
          variants?: string[] | null
          verb_radical?: string | null
          verb_root?: string | null
          verb_type?: string | null
          verbal_group?: number | null
          word?: string
        }
        Relationships: []
      }
      dictionary_feedback: {
        Row: {
          applied: boolean | null
          created_at: string | null
          entry_id: string
          feedback_type: string
          field_name: string | null
          id: string
          is_validated: boolean | null
          notes: string | null
          suggested_value: string | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          applied?: boolean | null
          created_at?: string | null
          entry_id: string
          feedback_type: string
          field_name?: string | null
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          suggested_value?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          applied?: boolean | null
          created_at?: string | null
          entry_id?: string
          feedback_type?: string
          field_name?: string | null
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          suggested_value?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_feedback_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "dictionary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      idiomatic_expressions: {
        Row: {
          bariba_expression: string
          category: string
          created_at: string | null
          created_by: string | null
          french_expression: string
          id: string
          is_verified: boolean | null
          updated_at: string | null
          usage_context: string | null
        }
        Insert: {
          bariba_expression: string
          category: string
          created_at?: string | null
          created_by?: string | null
          french_expression: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          usage_context?: string | null
        }
        Update: {
          bariba_expression?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          french_expression?: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          usage_context?: string | null
        }
        Relationships: []
      }
      model_performance: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number | null
          model_version: string
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value?: number | null
          model_version: string
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number | null
          model_version?: string
          recorded_at?: string | null
        }
        Relationships: []
      }
      model_test_results: {
        Row: {
          api_confidence: number | null
          api_duration_ms: number | null
          api_translation: string | null
          id: string
          local_confidence: number | null
          local_duration_ms: number | null
          local_translation: string | null
          notes: string | null
          source_language: string
          target_language: string
          test_phrase: string
          tested_at: string | null
          tested_by: string | null
        }
        Insert: {
          api_confidence?: number | null
          api_duration_ms?: number | null
          api_translation?: string | null
          id?: string
          local_confidence?: number | null
          local_duration_ms?: number | null
          local_translation?: string | null
          notes?: string | null
          source_language: string
          target_language: string
          test_phrase: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Update: {
          api_confidence?: number | null
          api_duration_ms?: number | null
          api_translation?: string | null
          id?: string
          local_confidence?: number | null
          local_duration_ms?: number | null
          local_translation?: string | null
          notes?: string | null
          source_language?: string
          target_language?: string
          test_phrase?: string
          tested_at?: string | null
          tested_by?: string | null
        }
        Relationships: []
      }
      noun_class_attributes: {
        Row: {
          class_code: string
          created_at: string | null
          id: string
          plural_determiner: string | null
          plural_subject: string | null
          possessive_pattern: string | null
          relative_pronoun: string | null
          singular_determiner: string | null
          singular_subject: string | null
        }
        Insert: {
          class_code: string
          created_at?: string | null
          id?: string
          plural_determiner?: string | null
          plural_subject?: string | null
          possessive_pattern?: string | null
          relative_pronoun?: string | null
          singular_determiner?: string | null
          singular_subject?: string | null
        }
        Update: {
          class_code?: string
          created_at?: string | null
          id?: string
          plural_determiner?: string | null
          plural_subject?: string | null
          possessive_pattern?: string | null
          relative_pronoun?: string | null
          singular_determiner?: string | null
          singular_subject?: string | null
        }
        Relationships: []
      }
      training_phrases: {
        Row: {
          bariba_text: string
          created_at: string | null
          created_by: string | null
          french_text: string
          id: string
          is_validated: boolean | null
          metadata: Json | null
          quality_score: number | null
          source: string | null
        }
        Insert: {
          bariba_text: string
          created_at?: string | null
          created_by?: string | null
          french_text: string
          id?: string
          is_validated?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          source?: string | null
        }
        Update: {
          bariba_text?: string
          created_at?: string | null
          created_by?: string | null
          french_text?: string
          id?: string
          is_validated?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          source?: string | null
        }
        Relationships: []
      }
      translation_context: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          session_id: string
          source_language: string
          source_text: string
          target_language: string
          target_text: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          session_id: string
          source_language: string
          source_text: string
          target_language: string
          target_text: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          session_id?: string
          source_language?: string
          source_text?: string
          target_language?: string
          target_text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      translation_feedback: {
        Row: {
          created_at: string | null
          feedback_type: string
          id: string
          is_validated: boolean | null
          notes: string | null
          suggested_translation: string | null
          translation_log_id: string | null
          used_for_training: boolean | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_type: string
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          suggested_translation?: string | null
          translation_log_id?: string | null
          used_for_training?: boolean | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_type?: string
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          suggested_translation?: string | null
          translation_log_id?: string | null
          used_for_training?: boolean | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_feedback_translation_log_id_fkey"
            columns: ["translation_log_id"]
            isOneToOne: false
            referencedRelation: "translation_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_logs: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          duration_ms: number | null
          id: string
          input_text: string
          model_version: string | null
          output_text: string
          source_language: string
          target_language: string
          translation_method: string | null
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_text: string
          model_version?: string | null
          output_text: string
          source_language: string
          target_language: string
          translation_method?: string | null
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_text?: string
          model_version?: string | null
          output_text?: string
          source_language?: string
          target_language?: string
          translation_method?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      translation_memory: {
        Row: {
          confidence_score: number | null
          context: Json | null
          created_at: string | null
          id: string
          source_language: string
          source_text: string
          target_language: string
          target_text: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          source_language: string
          source_text: string
          target_language: string
          target_text: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          source_language?: string
          source_text?: string
          target_language?: string
          target_text?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          created_at: string | null
          feedback_given: number | null
          id: string
          level: number | null
          phrases_contributed: number | null
          phrases_validated: number | null
          total_points: number | null
          translations_made: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_given?: number | null
          id?: string
          level?: number | null
          phrases_contributed?: number | null
          phrases_validated?: number | null
          total_points?: number | null
          translations_made?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_given?: number | null
          id?: string
          level?: number | null
          phrases_contributed?: number | null
          phrases_validated?: number | null
          total_points?: number | null
          translations_made?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verbal_conjugations: {
        Row: {
          created_at: string | null
          example: string | null
          id: string
          particle: string | null
          person: string
          prefix: string | null
          suffix: string | null
          tense_aspect: string
          verb_group: number
        }
        Insert: {
          created_at?: string | null
          example?: string | null
          id?: string
          particle?: string | null
          person: string
          prefix?: string | null
          suffix?: string | null
          tense_aspect: string
          verb_group: number
        }
        Update: {
          created_at?: string | null
          example?: string | null
          id?: string
          particle?: string | null
          person?: string
          prefix?: string | null
          suffix?: string | null
          tense_aspect?: string
          verb_group?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level: { Args: { points: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
