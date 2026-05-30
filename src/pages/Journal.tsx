import type { Quest } from '../types/quest';
import { Zap, Clock } from 'lucide-react';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_LABEL = { high: '급함', medium: '보통', low: '여유' };
const PRIORITY_DOT = { high: 'bg-[#1A1A1A]', medium: 'bg-[#9A9A9A]', low: 'bg-[#D0D0D0]' };

interface Props {
  quests: Quest[];
}

export function Journal({ quests }: Props) {
  const sorted = [...quests].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <Zap size={40} strokeWidth={1} className="text-[#C8B89A]" />
        <p className="text-[17px] font-semibold text-[#1A1A1A]">할일이 없어요</p>
        <p className="text-[14px] text-[#9A9A9A]">음성 버튼으로 추가해 보세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-[#1A1A1A]">일지</h1>
        <span className="text-[13px] text-[#9A9A9A]">총 {sorted.length}개</span>
      </div>

      <ul className="flex-1 overflow-y-auto px-5 pb-4 space-y-2 scrollbar-hide">
        {sorted.map((quest, i) => {
          const doneCount = quest.subtasks.filter((s) => s.done).length;
          const total = quest.subtasks.length;

          return (
            <li
              key={quest.id}
              className="
                bg-white border-[1.5px] border-[#1A1A1A] rounded-2xl
                px-4 py-3.5 flex items-center gap-3
              "
            >
              {/* Priority indicator */}
              <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[quest.priority]}`} />

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">
                  {quest.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] text-[#9A9A9A]">
                    {PRIORITY_LABEL[quest.priority]}
                  </span>
                  {total > 0 && (
                    <span className="text-[12px] text-[#9A9A9A]">
                      · {doneCount}/{total}
                    </span>
                  )}
                </div>
              </div>

              {/* Time tag */}
              <div className="shrink-0 flex items-center gap-1 text-[12px] text-[#9A9A9A]">
                <Clock size={11} strokeWidth={1.5} />
                <span>{quest.estimatedMinutes}분</span>
              </div>

              {/* Order number */}
              <span className="shrink-0 text-[12px] font-medium text-[#9A9A9A] w-5 text-right">
                {i + 1}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
