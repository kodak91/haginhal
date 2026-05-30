import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
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

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QuestTimer({ subtasks, onSubtaskToggle, onQuestComplete }: Props) {
  const undone = subtasks.filter((s) => !s.done);

  const [timer, setTimer] = useState<TimerState>(() => {
    const id = undone[0]?.id ?? null;
    const mins = undone[0]?.estimatedMinutes ?? 5;
    return { isRunning: false, currentId: id, remainingSeconds: mins * 60 };
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const advancingRef = useRef(false); // true while waiting for Firestore to confirm done
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

        // Time's up for current subtask
        clearInterval(intervalRef.current);
        if (prev.currentId) {
          advancingRef.current = true;
          playSubtaskComplete();
          onSubtaskToggle(prev.currentId); // marks done → triggers subtasks prop update
        }
        return { ...prev, isRunning: false, remainingSeconds: 0 };
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timer.isRunning, timer.currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to subtasks prop changes (Firestore update or manual toggle) ──
  useEffect(() => {
    const { isRunning, currentId } = timerRef.current;

    if (advancingRef.current) {
      // Timer just finished a subtask — advance to next
      advancingRef.current = false;
      const nextId = firstUndoneId(subtasks, currentId ?? undefined);
      if (!nextId) {
        playQuestComplete();
        setTimeout(() => onQuestComplete(), 800);
        setTimer({ isRunning: false, currentId: null, remainingSeconds: 0 });
      } else {
        const next = subtasks.find((s) => s.id === nextId)!;
        setTimeout(() => {
          setTimer({
            isRunning: true,
            currentId: nextId,
            remainingSeconds: (next.estimatedMinutes ?? 5) * 60,
          });
        }, 500);
      }
      return;
    }

    // Manual toggle: if the current running subtask was ticked externally, advance
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
          setTimer({
            isRunning: true,
            currentId: nextId,
            remainingSeconds: (next.estimatedMinutes ?? 5) * 60,
          });
        }, 300);
      }
      return;
    }

    // When paused: sync to first undone subtask
    if (!isRunning && !advancingRef.current) {
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

  // ── No undone subtasks → nothing to show ─────────────────────────
  if (undone.length === 0) return null;

  const current = subtasks.find((s) => s.id === timer.currentId);
  if (!current) return null;

  const totalSeconds = (current.estimatedMinutes ?? 5) * 60;
  const progress = totalSeconds > 0
    ? Math.max(0, 1 - timer.remainingSeconds / totalSeconds)
    : 0;

  const handleToggle = () => {
    if (timer.currentId === null) return;
    setTimer((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-[#1A1A1A] bg-[#F2F2F2] p-4">
      {/* Current subtask label */}
      <p className="text-[13px] font-semibold text-[#1A1A1A] mb-2 truncate">
        {timer.isRunning ? '⏱ ' : '▶ '}{current.title}
      </p>

      {/* Progress bar + time */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-white border border-[#E0E0E0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#46E08A] rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[13px] font-medium text-[#1A1A1A] tabular-nums shrink-0">
          {fmt(timer.remainingSeconds)} 남음
        </span>
      </div>

      {/* Play / Pause */}
      <button
        onClick={handleToggle}
        className="
          w-full flex items-center justify-center gap-2 py-2.5 rounded-full
          bg-white border-2 border-[#1A1A1A]
          text-[14px] font-semibold text-[#1A1A1A]
          active:scale-[0.98] transition-transform
        "
      >
        {timer.isRunning ? (
          <><Pause size={15} strokeWidth={2} /> 일시정지</>
        ) : (
          <><Play size={15} strokeWidth={2} /> 타이머 시작</>
        )}
      </button>
    </div>
  );
}
