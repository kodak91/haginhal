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
    const id = undone[0]?.id ?? null;
    const mins = undone[0]?.estimatedMinutes ?? 5;
    return { isRunning: false, currentId: id, remainingSeconds: mins * 60 };
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const advancingRef = useRef(false);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  // Notify parent of timer state (for karaoke in SubtaskList)
  useEffect(() => {
    const current = subtasks.find((s) => s.id === timer.currentId);
    const totalSeconds = (current?.estimatedMinutes ?? 5) * 60;
    const progress = totalSeconds > 0 ? Math.max(0, 1 - timer.remainingSeconds / totalSeconds) : 0;
    onTimerUpdate(timer.currentId, progress, timer.isRunning);
  }, [timer.currentId, timer.remainingSeconds, timer.isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick
  useEffect(() => {
    if (!timer.isRunning) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev.remainingSeconds > 1) return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        clearInterval(intervalRef.current);
        if (prev.currentId) {
          advancingRef.current = true;
          playSubtaskComplete();
          onSubtaskToggle(prev.currentId);
        }
        return { ...prev, isRunning: false, remainingSeconds: 0 };
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timer.isRunning, timer.currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to subtask prop changes
  useEffect(() => {
    const { isRunning, currentId } = timerRef.current;
    if (advancingRef.current) {
      advancingRef.current = false;
      const nextId = firstUndoneId(subtasks, currentId ?? undefined);
      if (!nextId) {
        playQuestComplete();
        setTimeout(() => onQuestComplete(), 800);
        setTimer({ isRunning: false, currentId: null, remainingSeconds: 0 });
      } else {
        const next = subtasks.find((s) => s.id === nextId)!;
        setTimeout(() => {
          setTimer({ isRunning: true, currentId: nextId, remainingSeconds: (next.estimatedMinutes ?? 5) * 60 });
        }, 500);
      }
      return;
    }
    const current = subtasks.find((s) => s.id === currentId);
    if (isRunning && current?.done) {
      clearInterval(intervalRef.current);
      const nextId = firstUndoneId(subtasks, currentId ?? undefined);
      if (!nextId) {
        playQuestComplete();
        setTimeout(() => onQuestComplete(), 800);
        setTimer({ isRunning: false, currentId: null, remainingSeconds: 0 });
      } else {
        const next = subtasks.find((s) => s.id === nextId)!;
        setTimeout(() => {
          setTimer({ isRunning: true, currentId: nextId, remainingSeconds: (next.estimatedMinutes ?? 5) * 60 });
        }, 300);
      }
      return;
    }
    if (!isRunning) {
      const firstId = firstUndoneId(subtasks);
      if (firstId !== currentId) {
        const first = subtasks.find((s) => s.id === firstId);
        setTimer({ isRunning: false, currentId: firstId, remainingSeconds: firstId && first ? (first.estimatedMinutes ?? 5) * 60 : 0 });
      }
    }
  }, [subtasks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (undone.length === 0 || !timer.currentId) return null;

  // Render: button only (placed in card footer by QuestCard)
  return (
    <button
      onClick={() => setTimer((prev) => ({ ...prev, isRunning: !prev.isRunning }))}
      aria-label={timer.isRunning ? '일시정지' : '타이머 시작'}
      className="
        self-stretch aspect-square rounded-full border-2 border-[#1A1A1A]
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
