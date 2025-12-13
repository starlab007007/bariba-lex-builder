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
      smt_initialization_logs: {
        Row: {
          cache_preload_count: number | null
          cache_prewarmed: boolean | null
          corrector_ready: boolean | null
          dictionary_count: number
          duration_ms: number
          errors: Json | null
          id: string
          initialized_at: string | null
          performance_metrics: Json | null
          phrases_count: number
          smt_ready: boolean | null
          source_stats: Json | null
          trie_ready: boolean | null
        }
        Insert: {
          cache_preload_count?: number | null
          cache_prewarmed?: boolean | null
          corrector_ready?: boolean | null
          dictionary_count: number
          duration_ms: number
          errors?: Json | null
          id?: string
          initialized_at?: string | null
          performance_metrics?: Json | null
          phrases_count: number
          smt_ready?: boolean | null
          source_stats?: Json | null
          trie_ready?: boolean | null
        }
        Update: {
          cache_preload_count?: number | null
          cache_prewarmed?: boolean | null
          corrector_ready?: boolean | null
          dictionary_count?: number
          duration_ms?: number
          errors?: Json | null
          id?: string
          initialized_at?: string | null
          performance_metrics?: Json | null
          phrases_count?: number
          smt_ready?: boolean | null
          source_stats?: Json | null
          trie_ready?: boolean | null
        }
        Relationships: []
      }
      smt_quality_metrics: {
        Row: {
          avg_confidence: number | null
          avg_duration_ms: number | null
          bleu_score: number | null
          created_at: string | null
          f1_score: number | null
          id: string
          model_version: string | null
          precision_score: number | null
          recall_score: number | null
          test_results: Json | null
          test_set_name: string
          tested_by: string | null
          total_phrases: number
        }
        Insert: {
          avg_confidence?: number | null
          avg_duration_ms?: number | null
          bleu_score?: number | null
          created_at?: string | null
          f1_score?: number | null
          id?: string
          model_version?: string | null
          precision_score?: number | null
          recall_score?: number | null
          test_results?: Json | null
          test_set_name: string
          tested_by?: string | null
          total_phrases: number
        }
        Update: {
          avg_confidence?: number | null
          avg_duration_ms?: number | null
          bleu_score?: number | null
          created_at?: string | null
          f1_score?: number | null
          id?: string
          model_version?: string | null
          precision_score?: number | null
          recall_score?: number | null
          test_results?: Json | null
          test_set_name?: string
          tested_by?: string | null
          total_phrases?: number
        }
        Relationships: []
      }
      tamtam_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tamtam_comments: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          post_id: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          post_id?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          post_id?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tamtam_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_emergency_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone: string
          relationship?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tamtam_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      tamtam_friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      tamtam_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tamtam_group_posts: {
        Row: {
          audio_url: string
          comments_count: number | null
          created_at: string | null
          duration_seconds: number | null
          feeling_emoji: string | null
          group_id: string
          id: string
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          comments_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          group_id: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          comments_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          group_id?: string
          id?: string
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tamtam_groups: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          members_count: number | null
          name: string
          owner_id: string | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          members_count?: number | null
          name: string
          owner_id?: string | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          members_count?: number | null
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      tamtam_jobs: {
        Row: {
          applications_count: number | null
          category: string | null
          created_at: string | null
          description_audio_url: string | null
          description_text: string | null
          employer_id: string | null
          id: string
          is_active: boolean | null
          job_type: string | null
          location: string | null
          salary_range: string | null
          title: string
        }
        Insert: {
          applications_count?: number | null
          category?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          title: string
        }
        Update: {
          applications_count?: number | null
          category?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          title?: string
        }
        Relationships: []
      }
      tamtam_messages: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      tamtam_notifications: {
        Row: {
          actor_id: string | null
          audio_description_url: string | null
          created_at: string | null
          group_id: string | null
          id: string
          is_read: boolean | null
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          audio_description_url?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          audio_description_url?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      tamtam_posts: {
        Row: {
          audio_url: string
          comments_count: number | null
          created_at: string | null
          duration_seconds: number | null
          feeling_emoji: string | null
          hashtags: string[] | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          shares_count: number | null
          thumbnail_url: string | null
          transcript: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string | null
        }
        Insert: {
          audio_url: string
          comments_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          transcript?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string
          comments_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          transcript?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tamtam_products: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description_audio_url: string | null
          description_text: string | null
          id: string
          images: string[] | null
          is_available: boolean | null
          location: string | null
          price: number | null
          seller_id: string | null
          title: string
          views_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          location?: string | null
          price?: number | null
          seller_id?: string | null
          title: string
          views_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          location?: string | null
          price?: number | null
          seller_id?: string | null
          title?: string
          views_count?: number | null
        }
        Relationships: []
      }
      tamtam_profiles: {
        Row: {
          avatar_url: string | null
          bio_audio_url: string | null
          bio_transcript_ba: string | null
          bio_transcript_fr: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          friends_count: number | null
          id: string
          is_verified: boolean | null
          last_seen_at: string | null
          location: string | null
          phone_number: string | null
          posts_count: number | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio_audio_url?: string | null
          bio_transcript_ba?: string | null
          bio_transcript_fr?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          friends_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          phone_number?: string | null
          posts_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio_audio_url?: string | null
          bio_transcript_ba?: string | null
          bio_transcript_fr?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          friends_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          phone_number?: string | null
          posts_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      tamtam_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tamtam_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_rooms: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          is_live: boolean | null
          max_participants: number | null
          participants_count: number | null
          started_at: string | null
          title: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          participants_count?: number | null
          started_at?: string | null
          title: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          participants_count?: number | null
          started_at?: string | null
          title?: string
        }
        Relationships: []
      }
      tamtam_shares: {
        Row: {
          created_at: string | null
          id: string
          message_audio_url: string | null
          post_id: string
          shared_to: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_audio_url?: string | null
          post_id: string
          shared_to?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_audio_url?: string | null
          post_id?: string
          shared_to?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tamtam_stories: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          expires_at: string | null
          id: string
          photo_url: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          photo_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          photo_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
          views_count?: number | null
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
