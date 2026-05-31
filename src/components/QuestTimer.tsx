import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { Subtask } from '../types/quest';
import { playSubtaskComplete, playQuestComplete } from '../lib/audio';

interface Props {
  subtasks: Subtask[];
  onSubtaskToggle: (id: string) => void;
  onQuestComplete: () => void;
  onTimerUpdate: (id: string | null, progress: number, isRunning: boolean) => void;
}

interface TimerState {
  isRunning: boolean;
  currentId: string | null;
  remainingSeconds: number;
}

function firstUndoneId(subtasks: Subtask[], afterId?: string): string | null {
  const startIdx = afterId ? subtasks.findIndex((s) => s.id === afterId) + 1 : 0;
  for (let i = startIdx; i < subtasks.length; i++) {
    if (!subtasks[i].done) return subtasks[i].id;
  }
  return null;
}

export function QuestTimer({ subtasks, onSubtaskToggle, onQuestComplete, onTimerUpdate }: Props) {
  const undone = subtasks.filter((s) => !s.done);

  const [timer, setTimer] = useState<TimerState>(() => {
    const first = undone[0] ?? null;
    return {
      isRunning: false,
      currentId: first?.id ?? null,
      remainingSeconds: (first?.estimatedMinutes ?? 5) * 60,
    };
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  // Always-fresh callback refs — no stale closure issues in interval
  const onSubtaskToggleRef = useRef(onSubtaskToggle);
  onSubtaskToggleRef.current = onSubtaskToggle;
  const onQuestCompleteRef = useRef(onQuestComplete);
  onQuestCompleteRef.current = onQuestComplete;
  const onTimerUpdateRef = useRef(onTimerUpdate);
  onTimerUpdateRef.current = onTimerUpdate;
  const subtasksRef = useRef(subtasks);
  subtasksRef.current = subtasks;

  // Tracks the subtask ID that the timer just expired on.
  // Cleared only once the subtask is confirmed done in the Firestore snapshot.
  // More reliable than a boolean flag (advancingRef) which could be consumed
  // before the Firestore round-trip completes.
  const expiredIdRef = useRef<string | null>(null);

  // Notify parent every tick for karaoke fill
  useEffect(() => {
    const current = subtasks.find((s) => s.id === timer.currentId);
    const totalSeconds = (current?.estimatedMinutes ?? 5) * 60;
    const progress = totalSeconds > 0 ? Math.max(0, 1 - timer.remainingSeconds / totalSeconds) : 0;
    onTimerUpdateRef.current(timer.currentId, progress, timer.isRunning);
  }, [timer.currentId, timer.remainingSeconds, timer.isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: advance timer to next undone subtask (or finish quest)
  const advanceTo = useRef((nextId: string | null) => {
    if (!nextId) {
      playQuestComplete();
      setTimeout(() => onQuestCompleteRef.current(), 800);
      setTimer({ isRunning: false, currentId: null, remainingSeconds: 0 });
    } else {
      const next = subtasksRef.current.find((s) => s.id === nextId);
      setTimeout(() => {
        setTimer({
          isRunning: true,
          currentId: nextId,
          remainingSeconds: (next?.estimatedMinutes ?? 5) * 60,
        });
      }, 500);
    }
  });

  // Tick
  useEffect(() => {
    if (!timer.isRunning) { clearInterval(intervalRef.current); return; }

    intervalRef.current = setInterval(() => {
      const t = timerRef.current;
      if (!t.isRunning || !t.currentId) return;

      if (t.remainingSeconds > 1) {
        setTimer((prev) => ({ ...prev, remainingSeconds: prev.remainingSeconds - 1 }));
        return;
      }

      // Timer expired — stop, mark done, wait for Firestore confirmation
      clearInterval(intervalRef.current);
      const expiredId = t.currentId;
      setTimer((prev) => ({ ...prev, isRunning: false, remainingSeconds: 0 }));
      expiredIdRef.current = expiredId;   // advance happens in subtasks effect
      playSubtaskComplete();
      onSubtaskToggleRef.current(expiredId);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timer.isRunning, timer.currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to subtask prop changes
  useEffect(() => {
    const { isRunning, currentId } = timerRef.current;

    // Timer expiry: advance only after Firestore confirms the subtask is done
    if (expiredIdRef.current !== null) {
      const expiredId = expiredIdRef.current;
      const task = subtasks.find((s) => s.id === expiredId);
      if (task?.done) {
        expiredIdRef.current = null;
        advanceTo.current(firstUndoneId(subtasks, expiredId));
      }
      // Not confirmed yet — wait for next subtasks update
      return;
    }

    // Current subtask was manually checked while timer was running
    const current = subtasks.find((s) => s.id === currentId);
    if (isRunning && current?.done) {
      clearInterval(intervalRef.current);
      advanceTo.current(firstUndoneId(subtasks, currentId ?? undefined));
      return;
    }

    // Sync currentId to first undone when paused
    if (!isRunning) {
      const firstId = firstUndoneId(subtasks);
      if (firstId !== currentId) {
        const first = subtasks.find((s) => s.id === firstId);
        setTimer({
          isRunning: false,
          currentId: firstId,
          remainingSeconds: firstId && first ? (first.estimatedMinutes ?? 5) * 60 : 0,
        });
      }
    }
  }, [subtasks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (undone.length === 0 || !timer.currentId) return null;

  return (
    <button
      onClick={() => setTimer((prev) => ({ ...prev, isRunning: !prev.isRunning }))}
      aria-label={timer.isRunning ? '일시정지' : '타이머 시작'}
      className="
        shrink-0 self-stretch aspect-square rounded-full border-2 border-[#1A1A1A]
        flex items-center justify-center
        active:bg-[#46E08A] transition-colors
      "
    >
      {timer.isRunning
        ? <Square size={11} fill="#1A1A1A" strokeWidth={0} />
        : <Play size={12} fill="#1A1A1A" strokeWidth={0} className="translate-x-px" />
      }
    </button>
  );
}
