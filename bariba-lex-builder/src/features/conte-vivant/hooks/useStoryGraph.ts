import { useState, useCallback, useMemo } from 'react';
import type { StoryGraph, StorySegment, StoryChoice } from '../types/story.types';

interface UseStoryGraphOptions {
  graph: StoryGraph | null;
}

export function useStoryGraph({ graph }: UseStoryGraphOptions) {
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [pathTaken, setPathTaken] = useState<string[]>([]);
  const [choicesMade, setChoicesMade] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  const currentSegment = useMemo<StorySegment | null>(() => {
    if (!graph || !currentSegmentId) return null;
    return graph.segments[currentSegmentId] ?? null;
  }, [graph, currentSegmentId]);

  const getSegment = useCallback((id: string): StorySegment | null => {
    if (!graph) return null;
    return graph.segments[id] ?? null;
  }, [graph]);

  const getChoices = useCallback((segmentId: string): StoryChoice[] => {
    const seg = getSegment(segmentId);
    if (!seg || !seg.is_choice_point) return [];
    return seg.choices;
  }, [getSegment]);

  const getDefault = useCallback((segmentId: string): StoryChoice | null => {
    const choices = getChoices(segmentId);
    return choices.find(c => c.is_default) ?? choices[0] ?? null;
  }, [getChoices]);

  const startStory = useCallback(() => {
    if (!graph) return;
    const entryId = graph.entry_segment;
    setCurrentSegmentId(entryId);
    setPathTaken([entryId]);
    setChoicesMade({});
    setIsComplete(false);
  }, [graph]);

  const resolveChoice = useCallback((choiceId: string) => {
    if (!graph || !currentSegmentId) return;
    const segment = graph.segments[currentSegmentId];
    if (!segment) return;

    const choice = segment.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const nextId = choice.next_segment;
    const nextSegment = graph.segments[nextId];

    setChoicesMade(prev => ({ ...prev, [currentSegmentId]: choiceId }));
    setPathTaken(prev => [...prev, nextId]);
    setCurrentSegmentId(nextId);

    if (nextSegment?.is_ending) {
      setIsComplete(true);
    }
  }, [graph, currentSegmentId]);

  const resolveDefault = useCallback(() => {
    if (!currentSegmentId) return;
    const def = getDefault(currentSegmentId);
    if (def) resolveChoice(def.id);
  }, [currentSegmentId, getDefault, resolveChoice]);

  const totalSegments = useMemo(() => {
    if (!graph) return 0;
    return Object.keys(graph.segments).length;
  }, [graph]);

  const totalEndings = useMemo(() => {
    if (!graph) return 0;
    return Object.values(graph.segments).filter(s => s.is_ending).length;
  }, [graph]);

  return {
    currentSegment,
    currentSegmentId,
    pathTaken,
    choicesMade,
    isComplete,
    totalSegments,
    totalEndings,
    startStory,
    getSegment,
    getChoices,
    getDefault,
    resolveChoice,
    resolveDefault,
  };
}
