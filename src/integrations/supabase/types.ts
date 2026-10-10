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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_generated_templates: {
        Row: {
          ai_analysis: Json | null
          ai_enhanced_description: string | null
          ai_preview_image_base64: string | null
          ai_preview_image_url: string | null
          ai_storyboard: Json | null
          ai_voice_description_ba: string | null
          ai_voice_description_fr: string | null
          collection: string | null
          color: string
          created_at: string | null
          demo_video_url: string | null
          description_ba: string | null
          description_fr: string
          download_count: number | null
          emoji: string
          family: string
          features: Json
          generation_status: string | null
          icon_url: string | null
          id: string
          inputs: Json
          is_active: boolean | null
          is_featured: boolean | null
          kse_engine: Json | null
          label_ba: string | null
          label_fr: string
          last_generated_at: string | null
          output_ratios: string[]
          preview_image_url: string | null
          rating_average: number | null
          rating_count: number | null
          storyboard_frames: Json | null
          supported_durations: string[]
          template_key: string
          updated_at: string | null
          usage_count: number | null
          visual_generation_status: string | null
          voice_instructions: Json
        }
        Insert: {
          ai_analysis?: Json | null
          ai_enhanced_description?: string | null
          ai_preview_image_base64?: string | null
          ai_preview_image_url?: string | null
          ai_storyboard?: Json | null
          ai_voice_description_ba?: string | null
          ai_voice_description_fr?: string | null
          collection?: string | null
          color: string
          created_at?: string | null
          demo_video_url?: string | null
          description_ba?: string | null
          description_fr: string
          download_count?: number | null
          emoji: string
          family: string
          features?: Json
          generation_status?: string | null
          icon_url?: string | null
          id?: string
          inputs?: Json
          is_active?: boolean | null
          is_featured?: boolean | null
          kse_engine?: Json | null
          label_ba?: string | null
          label_fr: string
          last_generated_at?: string | null
          output_ratios?: string[]
          preview_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          storyboard_frames?: Json | null
          supported_durations?: string[]
          template_key: string
          updated_at?: string | null
          usage_count?: number | null
          visual_generation_status?: string | null
          voice_instructions?: Json
        }
        Update: {
          ai_analysis?: Json | null
          ai_enhanced_description?: string | null
          ai_preview_image_base64?: string | null
          ai_preview_image_url?: string | null
          ai_storyboard?: Json | null
          ai_voice_description_ba?: string | null
          ai_voice_description_fr?: string | null
          collection?: string | null
          color?: string
          created_at?: string | null
          demo_video_url?: string | null
          description_ba?: string | null
          description_fr?: string
          download_count?: number | null
          emoji?: string
          family?: string
          features?: Json
          generation_status?: string | null
          icon_url?: string | null
          id?: string
          inputs?: Json
          is_active?: boolean | null
          is_featured?: boolean | null
          kse_engine?: Json | null
          label_ba?: string | null
          label_fr?: string
          last_generated_at?: string | null
          output_ratios?: string[]
          preview_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          storyboard_frames?: Json | null
          supported_durations?: string[]
          template_key?: string
          updated_at?: string | null
          usage_count?: number | null
          visual_generation_status?: string | null
          voice_instructions?: Json
        }
        Relationships: []
      }
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
      anime_scene_library: {
        Row: {
          action: string | null
          asset_type: string
          character_reference_id: string | null
          character_type: string | null
          consistency_score: number | null
          created_at: string
          description_en: string
          description_fr: string | null
          emotion: string
          generation_metadata: Json | null
          id: string
          image_url: string
          quality_score: number | null
          scene_type: string
          storage_path: string
          style: string
          tags: Json | null
          time_of_day: string | null
          updated_at: string
          usage_count: number | null
          video_duration: number | null
          video_url: string | null
          weather: string | null
        }
        Insert: {
          action?: string | null
          asset_type?: string
          character_reference_id?: string | null
          character_type?: string | null
          consistency_score?: number | null
          created_at?: string
          description_en: string
          description_fr?: string | null
          emotion: string
          generation_metadata?: Json | null
          id?: string
          image_url: string
          quality_score?: number | null
          scene_type: string
          storage_path: string
          style: string
          tags?: Json | null
          time_of_day?: string | null
          updated_at?: string
          usage_count?: number | null
          video_duration?: number | null
          video_url?: string | null
          weather?: string | null
        }
        Update: {
          action?: string | null
          asset_type?: string
          character_reference_id?: string | null
          character_type?: string | null
          consistency_score?: number | null
          created_at?: string
          description_en?: string
          description_fr?: string | null
          emotion?: string
          generation_metadata?: Json | null
          id?: string
          image_url?: string
          quality_score?: number | null
          scene_type?: string
          storage_path?: string
          style?: string
          tags?: Json | null
          time_of_day?: string | null
          updated_at?: string
          usage_count?: number | null
          video_duration?: number | null
          video_url?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anime_scene_library_character_reference_id_fkey"
            columns: ["character_reference_id"]
            isOneToOne: false
            referencedRelation: "character_references"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_imports: {
        Row: {
          ai_analysis_status: string | null
          ai_confidence: number | null
          ai_metadata: Json | null
          category: string
          conversion_progress: number | null
          converted_at: string | null
          converted_format: string | null
          created_at: string | null
          error_message: string | null
          file_size: number
          id: string
          mime_type: string | null
          needs_conversion: boolean | null
          original_format: string | null
          original_name: string
          public_url: string | null
          status: string | null
          storage_path: string
          target_name: string
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_analysis_status?: string | null
          ai_confidence?: number | null
          ai_metadata?: Json | null
          category: string
          conversion_progress?: number | null
          converted_at?: string | null
          converted_format?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size: number
          id?: string
          mime_type?: string | null
          needs_conversion?: boolean | null
          original_format?: string | null
          original_name: string
          public_url?: string | null
          status?: string | null
          storage_path: string
          target_name: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_analysis_status?: string | null
          ai_confidence?: number | null
          ai_metadata?: Json | null
          category?: string
          conversion_progress?: number | null
          converted_at?: string | null
          converted_format?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size?: number
          id?: string
          mime_type?: string | null
          needs_conversion?: boolean | null
          original_format?: string | null
          original_name?: string
          public_url?: string | null
          status?: string | null
          storage_path?: string
          target_name?: string
          uploaded_at?: string | null
          user_id?: string | null
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
      bariba_corpus_phrases: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          id: string
          is_active: boolean
          recordings_count: number
          source: string | null
          text_bariba: string
          text_french: string | null
          updated_at: string
          word_count: number
        }
        Insert: {
          category: string
          created_at?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          recordings_count?: number
          source?: string | null
          text_bariba: string
          text_french?: string | null
          updated_at?: string
          word_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          recordings_count?: number
          source?: string | null
          text_bariba?: string
          text_french?: string | null
          updated_at?: string
          word_count?: number
        }
        Relationships: []
      }
      bariba_voice_recordings: {
        Row: {
          admin_notes: string | null
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          phrase_id: string
          rejected: boolean
          storage_path: string
          updated_at: string
          user_id: string
          validated: boolean
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          phrase_id: string
          rejected?: boolean
          storage_path: string
          updated_at?: string
          user_id: string
          validated?: boolean
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          phrase_id?: string
          rejected?: boolean
          storage_path?: string
          updated_at?: string
          user_id?: string
          validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bariba_voice_recordings_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "bariba_corpus_phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_challenges: {
        Row: {
          challenge_date: string
          created_at: string
          id: string
          is_active: boolean
          prompt_ba: string | null
          prompt_fr: string
          proverb_ba: string | null
          proverb_fr: string | null
        }
        Insert: {
          challenge_date?: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_ba?: string | null
          prompt_fr: string
          proverb_ba?: string | null
          proverb_fr?: string | null
        }
        Update: {
          challenge_date?: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_ba?: string | null
          prompt_fr?: string
          proverb_ba?: string | null
          proverb_fr?: string | null
        }
        Relationships: []
      }
      battle_response_votes: {
        Row: {
          created_at: string
          id: string
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_response_votes_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "battle_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_responses: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          audio_url: string | null
          challenge_id: string
          created_at: string
          id: string
          local_score: number | null
          response_lang: string
          response_text: string
          scoring_method: string
          updated_at: string
          user_id: string
          votes_count: number
          xp_awarded: number
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          audio_url?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          local_score?: number | null
          response_lang?: string
          response_text: string
          scoring_method?: string
          updated_at?: string
          user_id: string
          votes_count?: number
          xp_awarded?: number
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          audio_url?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          local_score?: number | null
          response_lang?: string
          response_text?: string
          scoring_method?: string
          updated_at?: string
          user_id?: string
          votes_count?: number
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_responses_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "battle_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      character_references: {
        Row: {
          character_name: string
          color_palette: string[] | null
          created_at: string | null
          embedding_metadata: Json | null
          id: string
          reference_image_url: string
          style_keywords: string[] | null
        }
        Insert: {
          character_name: string
          color_palette?: string[] | null
          created_at?: string | null
          embedding_metadata?: Json | null
          id?: string
          reference_image_url: string
          style_keywords?: string[] | null
        }
        Update: {
          character_name?: string
          color_palette?: string[] | null
          created_at?: string | null
          embedding_metadata?: Json | null
          id?: string
          reference_image_url?: string
          style_keywords?: string[] | null
        }
        Relationships: []
      }
      classe_answer_keys: {
        Row: {
          accepted_answers: string[]
          audio_url: string | null
          created_at: string
          created_by: string | null
          explanation: string | null
          id: string
          lesson_id: string
          level: string
          module: string
          question_idx: number
          question_text: string | null
          section_key: string
          teacher_audio_duration: number | null
          teacher_audio_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_answers?: string[]
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          lesson_id: string
          level: string
          module: string
          question_idx?: number
          question_text?: string | null
          section_key?: string
          teacher_audio_duration?: number | null
          teacher_audio_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_answers?: string[]
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string
          level?: string
          module?: string
          question_idx?: number
          question_text?: string | null
          section_key?: string
          teacher_audio_duration?: number | null
          teacher_audio_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      classe_chapters: {
        Row: {
          chapter_key: string
          created_at: string
          id: string
          lesson_ids: string[]
          level: string
          order_index: number
          title_ba: string | null
          title_fr: string
          updated_at: string
        }
        Insert: {
          chapter_key: string
          created_at?: string
          id?: string
          lesson_ids?: string[]
          level: string
          order_index?: number
          title_ba?: string | null
          title_fr: string
          updated_at?: string
        }
        Update: {
          chapter_key?: string
          created_at?: string
          id?: string
          lesson_ids?: string[]
          level?: string
          order_index?: number
          title_ba?: string | null
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      classe_content_audios: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          content_key: string
          content_text: string
          content_type: string
          created_at: string
          duration_seconds: number | null
          file_name: string
          hierarchy_label: string | null
          id: string
          is_current: boolean
          item_index: number | null
          lesson_id: number | null
          level: string
          module: string
          peak_db: number | null
          quality_score: number | null
          reviewed_at: string | null
          rms_db: number | null
          section_key: string | null
          status: string
          storage_path: string
          teacher_id: string
          updated_at: string
          version: number
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          content_key: string
          content_text: string
          content_type: string
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          hierarchy_label?: string | null
          id?: string
          is_current?: boolean
          item_index?: number | null
          lesson_id?: number | null
          level: string
          module: string
          peak_db?: number | null
          quality_score?: number | null
          reviewed_at?: string | null
          rms_db?: number | null
          section_key?: string | null
          status?: string
          storage_path: string
          teacher_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          content_key?: string
          content_text?: string
          content_type?: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          hierarchy_label?: string | null
          id?: string
          is_current?: boolean
          item_index?: number | null
          lesson_id?: number | null
          level?: string
          module?: string
          peak_db?: number | null
          quality_score?: number | null
          reviewed_at?: string | null
          rms_db?: number | null
          section_key?: string | null
          status?: string
          storage_path?: string
          teacher_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      classe_evaluation_results: {
        Row: {
          attempts: number
          best_score: number
          completed_at: string
          details: Json | null
          evaluation_id: string
          id: string
          level: string
          max_score: number
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          completed_at?: string
          details?: Json | null
          evaluation_id: string
          id?: string
          level: string
          max_score?: number
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          best_score?: number
          completed_at?: string
          details?: Json | null
          evaluation_id?: string
          id?: string
          level?: string
          max_score?: number
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classe_grade_weights: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          lesson_weight: number
          level: string
          module: string
          question_idx: number
          section_key: string
          section_weight: number
          updated_at: string
          updated_by: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          lesson_weight?: number
          level: string
          module: string
          question_idx?: number
          section_key?: string
          section_weight?: number
          updated_at?: string
          updated_by?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          lesson_weight?: number
          level?: string
          module?: string
          question_idx?: number
          section_key?: string
          section_weight?: number
          updated_at?: string
          updated_by?: string | null
          weight?: number
        }
        Relationships: []
      }
      classe_self_assessments: {
        Row: {
          confidence_grade: number
          created_at: string
          id: string
          lesson_id: string
          level: string
          module: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_grade?: number
          created_at?: string
          id?: string
          lesson_id: string
          level: string
          module: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_grade?: number
          created_at?: string
          id?: string
          lesson_id?: string
          level?: string
          module?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classe_student_answers: {
        Row: {
          answer_audio_duration: number | null
          answer_audio_path: string | null
          answer_text: string | null
          field_data: Json | null
          graded_at: string | null
          graded_by: string | null
          id: string
          lesson_id: string
          level: string
          max_score: number | null
          module: string
          question_idx: number
          score: number | null
          section_key: string
          submitted_at: string
          teacher_audio_duration: number | null
          teacher_audio_path: string | null
          teacher_comment: string | null
          teacher_grade: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_audio_duration?: number | null
          answer_audio_path?: string | null
          answer_text?: string | null
          field_data?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          lesson_id: string
          level: string
          max_score?: number | null
          module: string
          question_idx?: number
          score?: number | null
          section_key?: string
          submitted_at?: string
          teacher_audio_duration?: number | null
          teacher_audio_path?: string | null
          teacher_comment?: string | null
          teacher_grade?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_audio_duration?: number | null
          answer_audio_path?: string | null
          answer_text?: string | null
          field_data?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          lesson_id?: string
          level?: string
          max_score?: number | null
          module?: string
          question_idx?: number
          score?: number | null
          section_key?: string
          submitted_at?: string
          teacher_audio_duration?: number | null
          teacher_audio_path?: string | null
          teacher_comment?: string | null
          teacher_grade?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classe_student_progress: {
        Row: {
          completed_lessons: number[]
          created_at: string
          extra_data: Json
          id: string
          last_lesson_id: number | null
          lesson_stars: Json
          level: string
          tabs_completed: Json
          theme_badges: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_lessons?: number[]
          created_at?: string
          extra_data?: Json
          id?: string
          last_lesson_id?: number | null
          lesson_stars?: Json
          level: string
          tabs_completed?: Json
          theme_badges?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_lessons?: number[]
          created_at?: string
          extra_data?: Json
          id?: string
          last_lesson_id?: number | null
          lesson_stars?: Json
          level?: string
          tabs_completed?: Json
          theme_badges?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classe_teacher_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          level: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          level?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          level?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      conte_vivant_progress: {
        Row: {
          choices: Json | null
          completed_at: string | null
          created_at: string
          endings_unlocked: string[] | null
          id: string
          path_taken: string[] | null
          replay_count: number
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          choices?: Json | null
          completed_at?: string | null
          created_at?: string
          endings_unlocked?: string[] | null
          id?: string
          path_taken?: string[] | null
          replay_count?: number
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          choices?: Json | null
          completed_at?: string | null
          created_at?: string
          endings_unlocked?: string[] | null
          id?: string
          path_taken?: string[] | null
          replay_count?: number
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conte_vivant_progress_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "conte_vivant_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      conte_vivant_stories: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          graph: Json
          id: string
          languages: string[] | null
          published_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          total_endings: number | null
          total_segments: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          graph?: Json
          id?: string
          languages?: string[] | null
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          total_endings?: number | null
          total_segments?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          graph?: Json
          id?: string
          languages?: string[] | null
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          total_endings?: number | null
          total_segments?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      conte_vivant_votes: {
        Row: {
          created_at: string
          id: string
          resolved_at: string | null
          results: Json | null
          segment_id: string
          session_id: string
          story_id: string
          voter_count: number | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          results?: Json | null
          segment_id: string
          session_id?: string
          story_id: string
          voter_count?: number | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          results?: Json | null
          segment_id?: string
          session_id?: string
          story_id?: string
          voter_count?: number | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conte_vivant_votes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "conte_vivant_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_contributions: {
        Row: {
          audio_url: string | null
          consent_given: boolean
          created_at: string
          id: string
          origin: string
          source_lang: string
          source_text: string
          target_lang: string
          target_text: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          consent_given?: boolean
          created_at?: string
          id?: string
          origin?: string
          source_lang: string
          source_text: string
          target_lang: string
          target_text: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          consent_given?: boolean
          created_at?: string
          id?: string
          origin?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          target_text?: string
          user_id?: string
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
          audio_transcription: string | null
          audio_transcription_confidence: number | null
          audio_url: string | null
          created_at: string | null
          entry_id: string
          feedback_source: string | null
          feedback_type: string
          field_name: string | null
          id: string
          is_validated: boolean | null
          notes: string | null
          source_language: string | null
          suggested_value: string | null
          user_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          applied?: boolean | null
          audio_transcription?: string | null
          audio_transcription_confidence?: number | null
          audio_url?: string | null
          created_at?: string | null
          entry_id: string
          feedback_source?: string | null
          feedback_type: string
          field_name?: string | null
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          source_language?: string | null
          suggested_value?: string | null
          user_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          applied?: boolean | null
          audio_transcription?: string | null
          audio_transcription_confidence?: number | null
          audio_url?: string | null
          created_at?: string | null
          entry_id?: string
          feedback_source?: string | null
          feedback_type?: string
          field_name?: string | null
          id?: string
          is_validated?: boolean | null
          notes?: string | null
          source_language?: string | null
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
      griot_drafts: {
        Row: {
          audio_url: string | null
          created_at: string
          duration: number | null
          id: string
          narrator_avatar_url: string | null
          scenes: Json | null
          step: string | null
          style: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          narrator_avatar_url?: string | null
          scenes?: Json | null
          step?: string | null
          style?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          narrator_avatar_url?: string | null
          scenes?: Json | null
          step?: string | null
          style?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      handunia_fragment_likes: {
        Row: {
          created_at: string
          fragment_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fragment_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fragment_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handunia_fragment_likes_fragment_id_fkey"
            columns: ["fragment_id"]
            isOneToOne: false
            referencedRelation: "handunia_fragments"
            referencedColumns: ["id"]
          },
        ]
      }
      handunia_fragments: {
        Row: {
          ai_assisted: boolean
          audio_url: string | null
          content_ba: string | null
          content_fr: string | null
          created_at: string
          id: string
          lieu_id: string
          likes_count: number
          user_id: string
        }
        Insert: {
          ai_assisted?: boolean
          audio_url?: string | null
          content_ba?: string | null
          content_fr?: string | null
          created_at?: string
          id?: string
          lieu_id: string
          likes_count?: number
          user_id: string
        }
        Update: {
          ai_assisted?: boolean
          audio_url?: string | null
          content_ba?: string | null
          content_fr?: string | null
          created_at?: string
          id?: string
          lieu_id?: string
          likes_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handunia_fragments_lieu_id_fkey"
            columns: ["lieu_id"]
            isOneToOne: false
            referencedRelation: "handunia_lieux"
            referencedColumns: ["id"]
          },
        ]
      }
      handunia_lieux: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fragments_count: number
          id: string
          name: string
          name_normalized: string
          region: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fragments_count?: number
          id?: string
          name: string
          name_normalized: string
          region?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fragments_count?: number
          id?: string
          name?: string
          name_normalized?: string
          region?: string | null
        }
        Relationships: []
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
      keyboard_learned_words: {
        Row: {
          count: number
          created_at: string
          id: string
          last_used: string
          user_id: string
          word: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          last_used?: string
          user_id: string
          word: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          last_used?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      learning_content_edits: {
        Row: {
          created_at: string
          edit_type: string
          editor_id: string
          field_name: string
          id: string
          lesson_id: string
          new_value: string | null
          old_value: string | null
          quiz_index: number | null
          section_index: number | null
          status: string
        }
        Insert: {
          created_at?: string
          edit_type: string
          editor_id: string
          field_name: string
          id?: string
          lesson_id: string
          new_value?: string | null
          old_value?: string | null
          quiz_index?: number | null
          section_index?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          edit_type?: string
          editor_id?: string
          field_name?: string
          id?: string
          lesson_id?: string
          new_value?: string | null
          old_value?: string | null
          quiz_index?: number | null
          section_index?: number | null
          status?: string
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
      music_library_tracks: {
        Row: {
          artist: string | null
          audio_url: string
          bpm: number | null
          category: string
          created_at: string
          description_fr: string | null
          duration: number | null
          id: string
          mood: string
          storage_path: string
          tags: Json | null
          title: string
          usage_count: number | null
        }
        Insert: {
          artist?: string | null
          audio_url: string
          bpm?: number | null
          category?: string
          created_at?: string
          description_fr?: string | null
          duration?: number | null
          id?: string
          mood?: string
          storage_path: string
          tags?: Json | null
          title: string
          usage_count?: number | null
        }
        Update: {
          artist?: string | null
          audio_url?: string
          bpm?: number | null
          category?: string
          created_at?: string
          description_fr?: string | null
          duration?: number | null
          id?: string
          mood?: string
          storage_path?: string
          tags?: Json | null
          title?: string
          usage_count?: number | null
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
      security_answers: {
        Row: {
          answers_hash: string
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          user_id: string
        }
        Insert: {
          answers_hash: string
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          user_id: string
        }
        Update: {
          answers_hash?: string
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          user_id?: string
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
          {
            foreignKeyName: "tamtam_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tamtam_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tamtam_community_messages: {
        Row: {
          audio_url: string | null
          community_id: string
          created_at: string | null
          duration_seconds: number | null
          emoji_code: string | null
          id: string
          media_url: string | null
          message_type: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          community_id: string
          created_at?: string | null
          duration_seconds?: number | null
          emoji_code?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          community_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          emoji_code?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tamtam_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_content_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_comment_id: string | null
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string | null
        }
        Relationships: []
      }
      tamtam_creation_templates: {
        Row: {
          category: string
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          label_ba: string | null
          label_fr: string
          music_url: string | null
          steps: Json
          template_key: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          label_ba?: string | null
          label_fr: string
          music_url?: string | null
          steps: Json
          template_key: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          label_ba?: string | null
          label_fr?: string
          music_url?: string | null
          steps?: Json
          template_key?: string
          usage_count?: number | null
        }
        Relationships: []
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
      tamtam_friend_suggestions: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          id: string
          mutual_friends_count: number | null
          reason: string | null
          score: number | null
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          mutual_friends_count?: number | null
          reason?: string | null
          score?: number | null
          suggested_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          mutual_friends_count?: number | null
          reason?: string | null
          score?: number | null
          suggested_user_id?: string
          user_id?: string
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
          is_verified: boolean | null
          last_activity_at: string | null
          members_count: number | null
          name: string
          owner_id: string | null
          rules_audio_url: string | null
          voice_description_url: string | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          members_count?: number | null
          name: string
          owner_id?: string | null
          rules_audio_url?: string | null
          voice_description_url?: string | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          last_activity_at?: string | null
          members_count?: number | null
          name?: string
          owner_id?: string | null
          rules_audio_url?: string | null
          voice_description_url?: string | null
        }
        Relationships: []
      }
      tamtam_job_applications: {
        Row: {
          applicant_id: string
          audio_message_url: string | null
          created_at: string | null
          id: string
          job_id: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          audio_message_url?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          audio_message_url?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "tamtam_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_jobs: {
        Row: {
          applications_count: number | null
          audio_presentation_url: string | null
          availability_status: string | null
          category: string | null
          contact_phone: string | null
          created_at: string | null
          description_audio_url: string | null
          description_text: string | null
          emoji_icon: string | null
          employer_id: string | null
          id: string
          is_active: boolean | null
          job_type: string | null
          location: string | null
          salary_range: string | null
          skills_audio_url: string | null
          title: string
          title_ba: string | null
          title_fr: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          applications_count?: number | null
          audio_presentation_url?: string | null
          availability_status?: string | null
          category?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          emoji_icon?: string | null
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          skills_audio_url?: string | null
          title: string
          title_ba?: string | null
          title_fr?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          applications_count?: number | null
          audio_presentation_url?: string | null
          availability_status?: string | null
          category?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          emoji_icon?: string | null
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_range?: string | null
          skills_audio_url?: string | null
          title?: string
          title_ba?: string | null
          title_fr?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      tamtam_learning_progress: {
        Row: {
          created_at: string | null
          feedback: string | null
          id: string
          post_id: string
          quiz_score: number | null
          repeated: boolean | null
          understood: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          post_id: string
          quiz_score?: number | null
          repeated?: boolean | null
          understood?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          id?: string
          post_id?: string
          quiz_score?: number | null
          repeated?: boolean | null
          understood?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_learning_progress_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tamtam_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_live_chat_messages: {
        Row: {
          created_at: string
          id: string
          live_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_live_chat_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "tamtam_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_live_reactions: {
        Row: {
          created_at: string | null
          id: string
          live_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          live_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          live_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_live_reactions_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "tamtam_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_live_signals: {
        Row: {
          created_at: string
          from_user: string
          id: string
          live_id: string
          payload: Json
          signal_type: string
          to_user: string | null
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          live_id: string
          payload: Json
          signal_type: string
          to_user?: string | null
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          live_id?: string
          payload?: Json
          signal_type?: string
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_live_signals_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "tamtam_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_live_viewers: {
        Row: {
          id: string
          joined_at: string | null
          live_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          live_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          live_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_live_viewers_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "tamtam_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_lives: {
        Row: {
          community_id: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          started_at: string | null
          status: string | null
          title: string
          title_audio_url: string | null
          viewer_count: number | null
        }
        Insert: {
          community_id?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          title: string
          title_audio_url?: string | null
          viewer_count?: number | null
        }
        Update: {
          community_id?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          title?: string
          title_audio_url?: string | null
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_lives_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "tamtam_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tamtam_lives_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "tamtam_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tamtam_local_alerts: {
        Row: {
          alert_type: string
          audio_url: string | null
          audio_url_ba: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          radius_km: number | null
          title: string
        }
        Insert: {
          alert_type: string
          audio_url?: string | null
          audio_url_ba?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          radius_km?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          audio_url?: string | null
          audio_url_ba?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          radius_km?: number | null
          title?: string
        }
        Relationships: []
      }
      tamtam_messages: {
        Row: {
          audio_url: string | null
          created_at: string | null
          duration_seconds: number | null
          emoji_code: string | null
          id: string
          is_read: boolean | null
          media_url: string | null
          message_type: string | null
          receiver_id: string | null
          sender_id: string | null
          text_content: string | null
          thumbnail_url: string | null
          transcript_ba: string | null
          transcript_fr: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          emoji_code?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          emoji_code?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
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
      tamtam_poll_options: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          poll_id: string
          position: number
          transcript: string | null
          vote_count: number | null
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          poll_id: string
          position: number
          transcript?: string | null
          vote_count?: number | null
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          poll_id?: string
          position?: number
          transcript?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "tamtam_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "tamtam_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tamtam_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "tamtam_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_polls: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_anonymous: boolean | null
          question_audio_url: string
          question_transcript: string | null
          user_id: string
          votes_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          question_audio_url: string
          question_transcript?: string | null
          user_id: string
          votes_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          question_audio_url?: string
          question_transcript?: string | null
          user_id?: string
          votes_count?: number | null
        }
        Relationships: []
      }
      tamtam_posts: {
        Row: {
          action_buttons: Json | null
          ai_generated: boolean
          audio_narration_ba_url: string | null
          audio_narration_url: string | null
          audio_url: string | null
          comments_count: number | null
          comprehension_score: number | null
          created_at: string | null
          culture_score: number | null
          duration_seconds: number | null
          feeling_emoji: string | null
          hashtags: string[] | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          media_type: string | null
          media_url: string | null
          product_id: string | null
          response_to_post_id: string | null
          shares_count: number | null
          template_id: string | null
          thumbnail_url: string | null
          topic: string | null
          transcript: string | null
          transcript_ba: string | null
          transcript_fr: string | null
          user_id: string | null
          utility_score: number | null
        }
        Insert: {
          action_buttons?: Json | null
          ai_generated?: boolean
          audio_narration_ba_url?: string | null
          audio_narration_url?: string | null
          audio_url?: string | null
          comments_count?: number | null
          comprehension_score?: number | null
          created_at?: string | null
          culture_score?: number | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_type?: string | null
          media_url?: string | null
          product_id?: string | null
          response_to_post_id?: string | null
          shares_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          topic?: string | null
          transcript?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
          utility_score?: number | null
        }
        Update: {
          action_buttons?: Json | null
          ai_generated?: boolean
          audio_narration_ba_url?: string | null
          audio_narration_url?: string | null
          audio_url?: string | null
          comments_count?: number | null
          comprehension_score?: number | null
          created_at?: string | null
          culture_score?: number | null
          duration_seconds?: number | null
          feeling_emoji?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_type?: string | null
          media_url?: string | null
          product_id?: string | null
          response_to_post_id?: string | null
          shares_count?: number | null
          template_id?: string | null
          thumbnail_url?: string | null
          topic?: string | null
          transcript?: string | null
          transcript_ba?: string | null
          transcript_fr?: string | null
          user_id?: string | null
          utility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "tamtam_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tamtam_posts_response_to_post_id_fkey"
            columns: ["response_to_post_id"]
            isOneToOne: false
            referencedRelation: "tamtam_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tamtam_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tamtam_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tamtam_products: {
        Row: {
          audio_description_ba: string | null
          category: string | null
          contact_audio_url: string | null
          created_at: string | null
          currency: string | null
          description_audio_url: string | null
          description_text: string | null
          emoji_icon: string | null
          id: string
          images: string[] | null
          is_available: boolean | null
          location: string | null
          price: number | null
          seller_id: string | null
          seller_phone: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          title_ba: string | null
          title_fr: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          audio_description_ba?: string | null
          category?: string | null
          contact_audio_url?: string | null
          created_at?: string | null
          currency?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          emoji_icon?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          location?: string | null
          price?: number | null
          seller_id?: string | null
          seller_phone?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          title_ba?: string | null
          title_fr?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          audio_description_ba?: string | null
          category?: string | null
          contact_audio_url?: string | null
          created_at?: string | null
          currency?: string | null
          description_audio_url?: string | null
          description_text?: string | null
          emoji_icon?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          location?: string | null
          price?: number | null
          seller_id?: string | null
          seller_phone?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          title_ba?: string | null
          title_fr?: string | null
          updated_at?: string | null
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
          is_ai_profile: boolean
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
          is_ai_profile?: boolean
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
          is_ai_profile?: boolean
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
        Relationships: [
          {
            foreignKeyName: "tamtam_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tamtam_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tamtam_story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tamtam_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "tamtam_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      tamtam_user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
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
      translation_history: {
        Row: {
          confidence_score: number | null
          context_data: Json | null
          created_at: string
          id: string
          input_mode: string
          is_favorite: boolean
          session_id: string
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          id?: string
          input_mode?: string
          is_favorite?: boolean
          session_id?: string
          source_language: string
          source_text: string
          target_language: string
          translated_text: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          context_data?: Json | null
          created_at?: string
          id?: string
          input_mode?: string
          is_favorite?: boolean
          session_id?: string
          source_language?: string
          source_text?: string
          target_language?: string
          translated_text?: string
          user_id?: string | null
        }
        Relationships: []
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
      user_contributions: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
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
      video_engagements: {
        Row: {
          completed: boolean | null
          created_at: string
          id: string
          interaction_type: string | null
          replayed: boolean | null
          session_id: string | null
          swipe_speed_ms: number | null
          user_id: string | null
          video_duration_ms: number | null
          video_id: string
          watch_duration_ms: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          id?: string
          interaction_type?: string | null
          replayed?: boolean | null
          session_id?: string | null
          swipe_speed_ms?: number | null
          user_id?: string | null
          video_duration_ms?: number | null
          video_id: string
          watch_duration_ms?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          id?: string
          interaction_type?: string | null
          replayed?: boolean | null
          session_id?: string | null
          swipe_speed_ms?: number | null
          user_id?: string | null
          video_duration_ms?: number | null
          video_id?: string
          watch_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_engagements_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_processing_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          renditions: Json | null
          status: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          renditions?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          renditions?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          metadata: Json | null
          shares_count: number | null
          template_id: string | null
          template_name: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          video_url: string
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          metadata?: Json | null
          shares_count?: number | null
          template_id?: string | null
          template_name?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_url: string
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          metadata?: Json | null
          shares_count?: number | null
          template_id?: string | null
          template_name?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_url?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "tamtam_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      word_submissions: {
        Row: {
          audio_definition_url: string | null
          audio_example_url: string | null
          audio_word_url: string | null
          created_at: string | null
          definition: string
          example_bariba: string | null
          example_francais: string | null
          id: string
          part_of_speech: string | null
          phonetic: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string | null
          transcription_confidence: number | null
          updated_at: string | null
          user_id: string | null
          word: string
        }
        Insert: {
          audio_definition_url?: string | null
          audio_example_url?: string | null
          audio_word_url?: string | null
          created_at?: string | null
          definition: string
          example_bariba?: string | null
          example_francais?: string | null
          id?: string
          part_of_speech?: string | null
          phonetic?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          transcription_confidence?: number | null
          updated_at?: string | null
          user_id?: string | null
          word: string
        }
        Update: {
          audio_definition_url?: string | null
          audio_example_url?: string | null
          audio_word_url?: string | null
          created_at?: string | null
          definition?: string
          example_bariba?: string | null
          example_francais?: string | null
          id?: string
          part_of_speech?: string | null
          phonetic?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          transcription_confidence?: number | null
          updated_at?: string | null
          user_id?: string | null
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level: { Args: { points: number }; Returns: number }
      corpus_contribution_count_this_month: { Args: never; Returns: number }
      get_user_phone: { Args: { target_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_teacher_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "editor" | "teacher"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "editor", "teacher"],
    },
  },
} as const
