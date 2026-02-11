import { useState, useEffect, useCallback, useRef } from 'react';

interface UseChoiceTimerOptions {
  duration?: number; // seconds, default 5
  onTimeout: () => void;
  enabled: boolean;
}

export function useChoiceTimer({ duration = 5, onTimeout, enabled }: UseChoiceTimerOptions) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const start = useCallback(() => {
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(duration);
  }, [stop, duration]);

  useEffect(() => {
    if (enabled && !isRunning) {
      start();
    }
    if (!enabled) {
      reset();
    }
  }, [enabled, start, reset, isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 0.1;
        if (next <= 0) {
          setIsRunning(false);
          onTimeoutRef.current();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const progress = (timeLeft / duration) * 100;

  return { timeLeft, progress, isRunning, start, stop, reset };
}
