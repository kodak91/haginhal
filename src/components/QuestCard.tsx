import { MapPin, Clock, Zap, ChevronRight } from 'lucide-react';
import type { Quest } from '../types/quest';
import { SubtaskList } from './SubtaskList';

const CATEGORY_ICON = { '실내': '🏠', '외출': '🚶' };
const TIME_LABEL = { '오전': '오전', '오후': '오후', '저녁': '저녁', '미정': '미정' };
const PRIORITY_COLOR = {
  high: 'bg-[#1A1A1A] text-white',
  medium: 'bg-[#F5F0E8] text-[#1A1A1A] border border-[#1A1A1A]',
  low: 'bg-[#F5F0E8] text-[#9A9A9A] border border-[#9A9A9A]',
};
const PRIORITY_LABEL = { high: '급함', medium: '보통', low: '여유' };

interface Props {
  quest: Quest;
  onSubtaskToggle: (subtaskId: string) => void;
  onDefer: () => void;
}

export function QuestCard({ quest, onSubtaskToggle, onDefer }: Props) {
  const doneCount = quest.subtasks.filter((s) => s.done).length;
  const total = quest.subtasks.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div
      className="
        bg-white border-[1.5px] border-[#1A1A1A] rounded-2xl
        flex flex-col h-full overflow-hidden
      "
    >
      {/* Top bar: progress */}
      <div className="h-1 bg-[#F5F0E8] rounded-t-2xl overflow-hidden">
        <div
          className="h-full bg-[#C8B89A] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col flex-1 p-5 overflow-y-auto scrollbar-hide">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Tag className="bg-[#F5F0E8] text-[#1A1A1A]">
              <span>{CATEGORY_ICON[quest.category]}</span>
              <span>{quest.category}</span>
            </Tag>
            <Tag className="bg-[#F5F0E8] text-[#1A1A1A]">
              <Clock size={11} strokeWidth={2} />
              <span>{TIME_LABEL[quest.timeOfDay]}</span>
            </Tag>
            <Tag className="bg-[#F5F0E8] text-[#1A1A1A]">
              <MapPin size={11} strokeWidth={2} />
              <span>{quest.estimatedMinutes}분</span>
            </Tag>
            <Tag className={PRIORITY_COLOR[quest.priority]}>
              <Zap size={10} strokeWidth={2} />
              <span>{PRIORITY_LABEL[quest.priority]}</span>
            </Tag>
          </div>

          {/* Defer button */}
          <button
            onClick={onDefer}
            className="
              shrink-0 flex items-center gap-1 text-[12px] text-[#9A9A9A]
              font-medium rounded-full border border-[#9A9A9A] px-2.5 py-1
              hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors
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
        {quest.subtasks.length > 0 && (
          <SubtaskList subtasks={quest.subtasks} onToggle={onSubtaskToggle} />
        )}

        {/* Empty subtasks state */}
        {quest.subtasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[#9A9A9A] text-[14px]">
            세부 단계가 없어요
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 text-[12px] font-medium
        px-2 py-0.5 rounded-full
        ${className ?? ''}
      `}
    >
      {children}
    </span>
  );
}
