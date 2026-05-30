import type { Subtask } from '../types/quest';

interface Props {
  subtasks: Subtask[];
  onToggle: (id: string) => void;
  timerCurrentId?: string | null;
  timerProgress?: number;
  timerRunning?: boolean;
}

export function SubtaskList({ subtasks, onToggle, timerCurrentId, timerProgress, timerRunning }: Props) {
  const firstUndoneIdx = subtasks.findIndex((s) => !s.done);

  return (
    <ul className="space-y-3 mt-4">
      {subtasks.map((task, i) => {
        const isDone = task.done;
        const isCurrent = i === firstUndoneIdx;
        const isFuture = !isDone && !isCurrent;
        const isTimerTarget = task.id === timerCurrentId && !isDone;

        return (
          <li
            key={task.id}
            onClick={() => onToggle(task.id)}
            className={`
              flex items-center gap-3 cursor-pointer select-none
              transition-opacity duration-200
              ${isDone || isFuture ? 'opacity-40' : ''}
            `}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
              className={`
                shrink-0 w-5 h-5 rounded-full border-2 border-[#1A1A1A]
                flex items-center justify-center transition-colors
                ${isDone ? 'bg-[#1A1A1A]' : 'bg-transparent'}
              `}
              aria-label={isDone ? '완료 취소' : '완료'}
            >
              {isDone && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 3.5L3.8 6.5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            {/* Bullet for current (not shown when timer is active on this item) */}
            {isCurrent && !isDone && !isTimerTarget && (
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#1A1A1A]"
                aria-hidden="true"
              />
            )}

            {/* Title — karaoke fill when timer is targeting this subtask */}
            {isTimerTarget ? (
              <span className="relative flex-1 text-[15px] leading-snug overflow-hidden">
                {/* Base text (gray) */}
                <span className="font-semibold text-[#C0C0C0]">{task.title}</span>
                {/* Overlay clips left → right */}
                <span
                  className="absolute inset-0 overflow-hidden font-bold text-[#46E08A] whitespace-nowrap"
                  style={{
                    width: `${(timerProgress ?? 0) * 100}%`,
                    transition: timerRunning ? 'width 1s linear' : 'none',
                  }}
                  aria-hidden="true"
                >
                  {task.title}
                </span>
              </span>
            ) : (
              <span
                className={`
                  text-[15px] leading-snug flex-1
                  ${isCurrent ? 'font-semibold text-[#1A1A1A]' : 'font-normal'}
                  ${isDone ? 'line-through' : ''}
                `}
              >
                {task.title}
              </span>
            )}

            {/* Estimated time — faint, right-aligned */}
            {task.estimatedMinutes != null && (
              <span className="shrink-0 text-[11px] text-[#C0C0C0]">
                {task.estimatedMinutes}분
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
