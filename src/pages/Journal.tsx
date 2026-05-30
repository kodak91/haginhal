import type { Quest } from '../types/quest';
import { Zap, Clock } from 'lucide-react';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_LABEL = { high: '급함', medium: '보통', low: '여유' };
const PRIORITY_DOT = { high: 'bg-[#1A1A1A]', medium: 'bg-[#9A9A9A]', low: 'bg-[#D0D0D0]' };

interface Props {
  quests: Quest[];
  completedQuests: Quest[];
}

export function Journal({ quests, completedQuests }: Props) {
  const sorted = [...quests].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  const isEmpty = sorted.length === 0 && completedQuests.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <Zap size={40} strokeWidth={1} className="text-[#46E08A]" />
        <p className="text-[17px] font-semibold text-[#1A1A1A]">할일이 없어요</p>
        <p className="text-[14px] text-[#9A9A9A]">음성 버튼으로 추가해 보세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-[#1A1A1A]">일지</h1>
        <span className="text-[13px] text-[#9A9A9A]">
          {sorted.length > 0 ? `진행 중 ${sorted.length}개` : ''}
          {sorted.length > 0 && completedQuests.length > 0 ? ' · ' : ''}
          {completedQuests.length > 0 ? `완료 ${completedQuests.length}개` : ''}
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-hide">
        {/* Active quests */}
        {sorted.map((quest, i) => {
          const doneCount = quest.subtasks.filter((s) => s.done).length;
          const total = quest.subtasks.length;

          return (
            <li
              key={quest.id}
              className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3.5 flex items-center gap-3 mb-2"
            >
              <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[quest.priority]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">
                  {quest.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] text-[#9A9A9A]">{PRIORITY_LABEL[quest.priority]}</span>
                  {total > 0 && (
                    <span className="text-[12px] text-[#9A9A9A]">· {doneCount}/{total}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-[12px] text-[#9A9A9A]">
                <Clock size={11} strokeWidth={1.5} />
                <span>{quest.estimatedMinutes}분</span>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-[#9A9A9A] w-5 text-right">
                {i + 1}
              </span>
            </li>
          );
        })}

        {/* Divider */}
        {completedQuests.length > 0 && (
          <li className="flex items-center gap-3 my-3 list-none">
            <div className="flex-1 border-t border-[#E0E0E0]" />
            <span className="text-[11px] text-[#9A9A9A] shrink-0">완료됨</span>
            <div className="flex-1 border-t border-[#E0E0E0]" />
          </li>
        )}

        {/* Completed quests — strikethrough + faded */}
        {completedQuests.map((quest) => (
          <li
            key={quest.id}
            className="bg-[#F0F0F0] border-2 border-[#E0E0E0] rounded-2xl px-4 py-3 flex items-center gap-3 mb-2 opacity-60"
          >
            {/* Done check */}
            <span className="shrink-0 w-4 h-4 rounded-full bg-[#C0C0C0] flex items-center justify-center">
              <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="flex-1 text-[14px] text-[#9A9A9A] truncate line-through decoration-[#B0B0B0]">
              {quest.title}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
