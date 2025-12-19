import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VocalFeedbackData {
  entryId: string;
  feedbackType: 'correction' | 'suggestion' | 'error' | 'audio_quality';
  fieldName?: string;
  textFeedback?: string;
  audioBlob?: Blob;
  audioTranscription?: string;
  sourceLang?: 'ba' | 'fr';
}

export interface NewWordData {
  word: string;
  phonetic?: string;
  definition: string;
  partOfSpeech?: string;
  exampleBariba?: string;
  exampleFrancais?: string;
  audioWordBlob?: Blob;
  audioDefinitionBlob?: Blob;
  audioExampleBlob?: Blob;
}

export function useVocalFeedback() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload audio to storage
  const uploadAudio = useCallback(async (
    blob: Blob, 
    prefix: string
  ): Promise<string | null> => {
    try {
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
      const filePath = `feedback/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('tamtam-audio')
        .upload(filePath, blob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (error) {
        console.error('[useVocalFeedback] Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('[useVocalFeedback] Upload failed:', err);
      return null;
    }
  }, []);

  // Submit feedback for an existing dictionary entry
  const submitFeedback = useCallback(async (feedback: VocalFeedbackData): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté pour envoyer un feedback');
      return false;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let audioUrl: string | null = null;

      // Upload audio if provided
      if (feedback.audioBlob) {
        setUploadProgress(30);
        audioUrl = await uploadAudio(feedback.audioBlob, 'feedback');
        if (!audioUrl) {
          throw new Error('Failed to upload audio');
        }
        setUploadProgress(60);
      }

      // Resolve entry_id: if it looks like a UUID, use it directly; otherwise, lookup by word
      let entryId = feedback.entryId;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(entryId)) {
        // entryId is a word, need to lookup the actual UUID
        console.log('[useVocalFeedback] Looking up entry_id for word:', entryId);
        const { data: entries, error: lookupError } = await supabase
          .from('dictionary_entries')
          .select('id')
          .ilike('word', entryId)
          .limit(1);
        
        if (lookupError) {
          console.error('[useVocalFeedback] Lookup error:', lookupError);
          throw new Error('Impossible de trouver l\'entrée du dictionnaire');
        }
        
        if (!entries || entries.length === 0) {
          console.error('[useVocalFeedback] Entry not found for word:', entryId);
          throw new Error(`Entrée "${entryId}" non trouvée dans le dictionnaire`);
        }
        
        entryId = entries[0].id;
        console.log('[useVocalFeedback] Found entry_id:', entryId);
      }

      // Insert feedback into database
      const { error } = await supabase
        .from('dictionary_feedback')
        .insert({
          entry_id: entryId,
          user_id: user.id,
          feedback_type: feedback.feedbackType,
          field_name: feedback.fieldName,
          suggested_value: feedback.textFeedback,
          audio_url: audioUrl,
          audio_transcription: feedback.audioTranscription,
          source_language: feedback.sourceLang || 'fr',
          feedback_source: feedback.audioBlob ? (feedback.textFeedback ? 'mixed' : 'audio') : 'text'
        });

      if (error) {
        console.error('[useVocalFeedback] Insert error:', error);
        throw error;
      }

      setUploadProgress(100);
      toast.success('Merci pour votre feedback !');
      return true;
    } catch (err: any) {
      console.error('[useVocalFeedback] Submit failed:', err);
      toast.error(err.message || 'Erreur lors de l\'envoi du feedback');
      return false;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [user, uploadAudio]);

  // Submit a new word suggestion
  const submitNewWord = useCallback(async (wordData: NewWordData): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté pour proposer un mot');
      return false;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let audioWordUrl: string | null = null;
      let audioDefinitionUrl: string | null = null;
      let audioExampleUrl: string | null = null;
      let progressStep = 10;

      // Upload word audio
      if (wordData.audioWordBlob) {
        audioWordUrl = await uploadAudio(wordData.audioWordBlob, 'word');
        progressStep += 25;
        setUploadProgress(progressStep);
      }

      // Upload definition audio
      if (wordData.audioDefinitionBlob) {
        audioDefinitionUrl = await uploadAudio(wordData.audioDefinitionBlob, 'definition');
        progressStep += 25;
        setUploadProgress(progressStep);
      }

      // Upload example audio
      if (wordData.audioExampleBlob) {
        audioExampleUrl = await uploadAudio(wordData.audioExampleBlob, 'example');
        progressStep += 25;
        setUploadProgress(progressStep);
      }

      // Insert new word submission
      const { error } = await supabase
        .from('word_submissions')
        .insert({
          user_id: user.id,
          word: wordData.word,
          phonetic: wordData.phonetic,
          definition: wordData.definition,
          part_of_speech: wordData.partOfSpeech || 'n',
          example_bariba: wordData.exampleBariba,
          example_francais: wordData.exampleFrancais,
          audio_word_url: audioWordUrl,
          audio_definition_url: audioDefinitionUrl,
          audio_example_url: audioExampleUrl,
          status: 'pending'
        });

      if (error) {
        console.error('[useVocalFeedback] New word insert error:', error);
        throw error;
      }

      setUploadProgress(100);
      toast.success('Mot proposé avec succès ! Il sera examiné par nos experts.');
      return true;
    } catch (err) {
      console.error('[useVocalFeedback] New word submit failed:', err);
      toast.error('Erreur lors de la proposition du mot');
      return false;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [user, uploadAudio]);

  return {
    submitFeedback,
    submitNewWord,
    isSubmitting,
    uploadProgress
  };
}
