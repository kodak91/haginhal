import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Quest } from '../types/quest';
import { SubtaskList } from './SubtaskList';
import { QuestTimer } from './QuestTimer';

const TIME_LABEL = { '오전': '오전', '오후': '오후', '저녁': '저녁', '미정': '미정' };
const PRIORITY_LABEL = { high: '급함', medium: '보통', low: '여유' } as const;

interface Props {
  quest: Quest;
  onSubtaskToggle: (subtaskId: string) => void;
  onDefer: () => void;
  onComplete: () => void;
}

export function QuestCard({ quest, onSubtaskToggle, onDefer, onComplete }: Props) {
  const doneCount = quest.subtasks.filter((s) => s.done).length;
  const total = quest.subtasks.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  const [timerInfo, setTimerInfo] = useState<{
    currentId: string | null;
    progress: number;
    isRunning: boolean;
  }>({ currentId: null, progress: 0, isRunning: false });

  const metaTags = [
    quest.category,
    TIME_LABEL[quest.timeOfDay],
    `${quest.estimatedMinutes}분`,
    PRIORITY_LABEL[quest.priority],
  ].join(' · ');

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-[#F2F2F2] rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-[#46E08A] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pt-5 pb-2 overflow-y-auto scrollbar-hide flex flex-col">
        {/* Header: meta tags + defer */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[12px] text-[#9A9A9A]">{metaTags}</span>
          <button
            onClick={onDefer}
            className="
              shrink-0 flex items-center gap-1 text-[12px] text-[#9A9A9A]
              font-medium rounded-full border border-[#9A9A9A] px-2.5 py-1
              active:text-[#1A1A1A] active:border-[#1A1A1A] transition-colors
              whitespace-nowrap
            "
          >
            <span>나중에</span>
            <ChevronRight size={11} strokeWidth={2} />
          </button>
        </div>

        {/* Quest title */}
        <h2 className="text-[22px] font-bold leading-tight text-[#1A1A1A] mb-1">
          {quest.title}
        </h2>

        {/* Progress text */}
        {total > 0 && (
          <p className="text-[13px] text-[#9A9A9A] mb-4">
            {doneCount}/{total} 단계 완료
          </p>
        )}

        {/* Subtasks */}
        {quest.subtasks.length > 0 ? (
          <SubtaskList
            subtasks={quest.subtasks}
            onToggle={onSubtaskToggle}
            timerCurrentId={timerInfo.currentId}
            timerProgress={timerInfo.progress}
            timerRunning={timerInfo.isRunning}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#9A9A9A] text-[14px]">
            세부 단계가 없어요
          </div>
        )}
      </div>

      {/* Fixed footer: complete + timer */}
      <div className="px-5 pb-5 pt-3 flex items-stretch gap-3">
        <button
          onClick={onComplete}
          className="
            flex-1 py-3.5 rounded-full
            bg-[#1A1A1A] text-white
            text-[15px] font-semibold tracking-wide
            border-2 border-[#1A1A1A]
            active:scale-[0.98] transition-transform
          "
        >
          완료
        </button>

        {quest.subtasks.length > 0 && (
          <QuestTimer
            key={quest.id}
            subtasks={quest.subtasks}
            onSubtaskToggle={onSubtaskToggle}
            onQuestComplete={onComplete}
            onTimerUpdate={(id, prog, running) =>
              setTimerInfo({ currentId: id, progress: prog, isRunning: running })
            }
          />
        )}
      </div>
    </div>
  );
}
