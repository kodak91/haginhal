import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { Subtask } from '../types/quest';
import { playSubtaskComplete, playQuestComplete } from '../lib/audio';

interface Props {
  subtasks: Subtask[];
  onSubtaskToggle: (id: string) => void;
  onQuestComplete: () => void;
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

export function QuestTimer({ subtasks, onSubtaskToggle, onQuestComplete }: Props) {
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

  // ── Tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timer.isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev.remainingSeconds > 1) {
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        }
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

  // ── React to subtask changes ──────────────────────────────────────
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
        setTimer({
          isRunning: false,
          currentId: firstId,
          remainingSeconds: firstId && first ? (first.estimatedMinutes ?? 5) * 60 : 0,
        });
      }
    }
  }, [subtasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── No undone subtasks ────────────────────────────────────────────
  if (undone.length === 0 || !timer.currentId) return null;

  const current = subtasks.find((s) => s.id === timer.currentId);
  if (!current) return null;

  const totalSeconds = (current.estimatedMinutes ?? 5) * 60;
  const progress = totalSeconds > 0 ? Math.max(0, 1 - timer.remainingSeconds / totalSeconds) : 0;

  const handleToggle = () => {
    if (timer.currentId === null) return;
    setTimer((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  return (
    <div className="mt-3 flex items-center gap-2.5 px-0.5">
      {/* ▶ / ■ icon only */}
      <button
        onClick={handleToggle}
        aria-label={timer.isRunning ? '일시정지' : '타이머 시작'}
        className="
          shrink-0 w-7 h-7 rounded-full border-2 border-[#1A1A1A]
          flex items-center justify-center
          active:bg-[#46E08A] transition-colors
        "
      >
        {timer.isRunning
          ? <Square size={10} fill="#1A1A1A" strokeWidth={0} />
          : <Play size={11} fill="#1A1A1A" strokeWidth={0} className="translate-x-px" />
        }
      </button>

      {/* Karaoke text: fills left→right as timer progresses */}
      <div className="flex-1 relative overflow-hidden" style={{ height: '1.1rem' }}>
        {/* Base layer: unfilled (light) */}
        <span className="absolute inset-0 text-[12px] font-medium text-[#D0D0D0] whitespace-nowrap leading-none flex items-center">
          {current.title}
        </span>
        {/* Fill layer: clips from left */}
        <span
          className="absolute inset-0 text-[12px] font-medium text-[#1A1A1A] whitespace-nowrap overflow-hidden leading-none flex items-center"
          style={{
            width: `${progress * 100}%`,
            transition: timer.isRunning ? 'width 1s linear' : 'none',
          }}
          aria-hidden="true"
        >
          {current.title}
        </span>
      </div>
    </div>
  );
}
