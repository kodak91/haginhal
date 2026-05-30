import { useState } from 'react';
import type { Quest } from '../types/quest';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const getQuestDate = (q: Quest): Date => q.completedAt ?? q.createdAt;

interface Props {
  completedQuests: Quest[];
}

export function History({ completedQuests }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  /* ── Calendar computation ────────────────────────────────── */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Days in this month view that have completed quests
  const markedDays = new Set(
    completedQuests
      .map((q) => {
        const d = getQuestDate(q);
        return d.getFullYear() === year && d.getMonth() === month
          ? d.getDate()
          : null;
      })
      .filter((d): d is number => d !== null)
  );

  /* ── Filtered list ───────────────────────────────────────── */
  const filtered = selectedDay
    ? completedQuests.filter((q) => {
        const d = getQuestDate(q);
        return (
          d.getFullYear() === year &&
          d.getMonth() === month &&
          d.getDate() === selectedDay
        );
      })
    : [...completedQuests].sort(
        (a, b) => getQuestDate(b).getTime() - getQuestDate(a).getTime()
      );

  /* ── Month navigation ────────────────────────────────────── */
  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-[#E0E0E0]"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <span className="text-[15px] font-bold text-[#1A1A1A]">
          {year}년 {month + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-[#E0E0E0]"
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-4 mb-0.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] text-[#9A9A9A] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-4 gap-y-0.5 mb-3">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isToday = isThisMonth && day === today.getDate();
          const isMarked = markedDays.has(day);
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`
                flex flex-col items-center py-1.5 rounded-xl transition-colors
                ${isSelected ? 'bg-[#1A1A1A]' : isMarked ? 'bg-[#F2F2F2]' : ''}
              `}
            >
              <span
                className={`
                  text-[13px] font-medium leading-none
                  ${isSelected ? 'text-white' : isToday ? 'font-bold text-[#46E08A]' : 'text-[#1A1A1A]'}
                `}
              >
                {day}
              </span>
              {/* Completion dot */}
              <span
                className={`
                  w-1 h-1 rounded-full mt-1
                  ${isMarked
                    ? isSelected ? 'bg-white' : 'bg-[#46E08A]'
                    : 'invisible'
                  }
                `}
              />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-5 border-t-2 border-[#1A1A1A] mb-3" />

      {/* List header */}
      <div className="px-5 mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold text-[#1A1A1A]">
          {selectedDay
            ? `${month + 1}월 ${selectedDay}일 완료`
            : '전체 기록'}
        </span>
        <span className="text-[12px] text-[#9A9A9A]">{filtered.length}개</span>
      </div>

      {/* Quest list */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
          <ClipboardList size={36} strokeWidth={1} className="text-[#46E08A]" />
          <p className="text-[14px] text-[#9A9A9A]">
            {selectedDay
              ? '이 날 완료한 퀘스트가 없어요'
              : '아직 완료한 퀘스트가 없어요'}
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-5 pb-4 space-y-2 scrollbar-hide">
          {filtered.map((quest) => {
            const d = getQuestDate(quest);
            const dateStr = d.toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
            });
            const total = quest.subtasks.length;
            const doneCount = quest.subtasks.filter((s) => s.done).length;

            return (
              <li
                key={quest.id}
                className="
                  bg-white border-2 border-[#E0E0E0] rounded-2xl
                  px-4 py-3.5 flex items-center gap-3 opacity-70
                "
              >
                {/* Done checkmark */}
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 3.5L3.8 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#9A9A9A] truncate line-through">
                    {quest.title}
                  </p>
                  {total > 0 && (
                    <p className="text-[12px] text-[#9A9A9A] mt-0.5">
                      {doneCount}/{total} 단계
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[12px] text-[#9A9A9A]">
                  {dateStr}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
