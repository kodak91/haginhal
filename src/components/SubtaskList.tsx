import type { Subtask } from '../types/quest';

interface Props {
  subtasks: Subtask[];
  onToggle: (id: string) => void;
}

export function SubtaskList({ subtasks, onToggle }: Props) {
  const firstUndoneIdx = subtasks.findIndex((s) => !s.done);

  return (
    <ul className="space-y-3 mt-4">
      {subtasks.map((task, i) => {
        const isDone = task.done;
        const isCurrent = i === firstUndoneIdx;
        const isFuture = !isDone && !isCurrent;

        return (
          <li
            key={task.id}
            onClick={() => onToggle(task.id)}
            className={`
              flex items-start gap-3 cursor-pointer select-none
              transition-opacity duration-200
              ${isDone || isFuture ? 'opacity-40' : ''}
            `}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
              className={`
                mt-0.5 shrink-0 w-5 h-5 rounded-full border-[1.5px] border-[#1A1A1A]
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

            {/* Bullet for current */}
            {isCurrent && !isDone && (
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-1.5 -ml-0.5"
                aria-hidden="true"
              />
            )}

            {/* Title */}
            <span
              className={`
                text-[15px] leading-snug flex-1
                ${isCurrent ? 'font-semibold text-[#1A1A1A]' : 'font-normal'}
                ${isDone ? 'line-through' : ''}
              `}
            >
              {task.title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
