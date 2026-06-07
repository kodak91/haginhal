import { useState } from 'react';
import type { Quest } from '../types/quest';
import { ChevronLeft, ChevronRight, ClipboardList, Flame, CalendarDays } from 'lucide-react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── KST 날짜 문자열 (YYYY-M-D) ─────────────────────────────── */
function toKSTStr(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  return `${kst.getUTCFullYear()}-${kst.getUTCMonth() + 1}-${kst.getUTCDate()}`;
}

function getQuestDate(q: Quest): Date {
  return q.completedAt ?? q.createdAt;
}

/* ── 연속 달성 스트릭 ─────────────────────────────────────────
   오늘 완료가 없으면 어제 기준으로 계산 (당일 중 끊기지 않게)   */
function calcStreak(quests: Quest[]): number {
  const days = new Set(quests.map((q) => toKSTStr(getQuestDate(q))));

  const todayStr = toKSTStr(new Date());
  const yesterdayStr = toKSTStr(new Date(Date.now() - 86_400_000));

  const startStr = days.has(todayStr) ? todayStr : yesterdayStr;
  if (!days.has(startStr)) return 0;

  let streak = 0;
  let cur = startStr;

  while (days.has(cur)) {
    streak++;
    const [y, m, d] = cur.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    cur = `${prev.getUTCFullYear()}-${prev.getUTCMonth() + 1}-${prev.getUTCDate()}`;
  }

  return streak;
}

/* ── 이번 주 (월~일) 완료 수 ─────────────────────────────────── */
function getWeekData(quests: Quest[]) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const todayStr = toKSTStr(now);

  const dow = kst.getUTCDay(); // 0=일
  const daysSinceMon = dow === 0 ? 6 : dow - 1;

  return ['월', '화', '수', '목', '금', '토', '일'].map((label, i) => {
    const d = new Date(Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() - daysSinceMon + i,
    ));
    const dateStr = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
    const count = quests.filter((q) => toKSTStr(getQuestDate(q)) === dateStr).length;
    return { label, dateStr, count, isToday: dateStr === todayStr };
  });
}

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
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  /* ── 달력 계산 ──────────────────────────────────────────────── */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const markedDays = new Set(
    completedQuests
      .map((q) => {
        const d = getQuestDate(q);
        return d.getFullYear() === year && d.getMonth() === month ? d.getDate() : null;
      })
      .filter((d): d is number => d !== null)
  );

  /* ── 날짜별 완료 목록 ────────────────────────────────────────── */
  const dayFiltered = selectedDay
    ? completedQuests.filter((q) => {
        const d = getQuestDate(q);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
      })
    : [];

  /* ── 대시보드 데이터 ─────────────────────────────────────────── */
  const streak = calcStreak(completedQuests);
  const thisMonthCount = completedQuests.filter((q) => {
    const d = getQuestDate(q);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  }).length;
  const weekData = getWeekData(completedQuests);
  const weekMax = Math.max(...weekData.map((d) => d.count), 1);

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── 월 네비게이션 ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
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

      {/* ── 요일 헤더 ── */}
      <div className="grid grid-cols-7 px-4 shrink-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] text-[#9A9A9A] py-1">{d}</div>
        ))}
      </div>

      {/* ── 달력 그리드 ── */}
      <div className="grid grid-cols-7 px-4 gap-y-0.5 mb-3 shrink-0">
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
              <span className={`
                text-[13px] font-medium leading-none
                ${isSelected ? 'text-white' : isToday ? 'font-bold text-[#46E08A]' : 'text-[#1A1A1A]'}
              `}>
                {day}
              </span>
              <span className={`
                w-1 h-1 rounded-full mt-1
                ${isMarked ? isSelected ? 'bg-white' : 'bg-[#46E08A]' : 'invisible'}
              `} />
            </button>
          );
        })}
      </div>

      {/* ── 구분선 ── */}
      <div className="mx-5 border-t-2 border-[#1A1A1A] mb-3 shrink-0" />

      {/* ── 하단: 대시보드 or 날짜별 목록 ── */}
      {selectedDay === null ? (
        /* ── 대시보드 ── */
        <div className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-hide">
          {/* 스탯 카드 2칸 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* 연속 달성 */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame size={13} strokeWidth={1.5} className={streak > 0 ? 'text-[#FF6B35]' : 'text-[#C0C0C0]'} />
                <span className="text-[11px] text-[#9A9A9A]">연속 달성</span>
              </div>
              <p className="text-[28px] font-bold text-[#1A1A1A] leading-none">
                {streak}
                <span className="text-[14px] font-medium text-[#9A9A9A] ml-1">일</span>
              </p>
              <p className="text-[11px] text-[#C0C0C0] mt-1">
                {streak === 0 ? '오늘 시작해 봐요' : streak >= 7 ? '이번 주 개근!' : '계속 해봐요'}
              </p>
            </div>

            {/* 이번 달 */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CalendarDays size={13} strokeWidth={1.5} className="text-[#9A9A9A]" />
                <span className="text-[11px] text-[#9A9A9A]">이번 달</span>
              </div>
              <p className="text-[28px] font-bold text-[#1A1A1A] leading-none">
                {thisMonthCount}
                <span className="text-[14px] font-medium text-[#9A9A9A] ml-1">개</span>
              </p>
              <p className="text-[11px] text-[#C0C0C0] mt-1">완료한 퀘스트</p>
            </div>
          </div>

          {/* 이번 주 바 차트 */}
          <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 pt-3.5 pb-3">
            <p className="text-[11px] text-[#9A9A9A] mb-3">이번 주</p>
            <div className="flex items-end justify-between gap-1.5">
              {weekData.map((day) => {
                const BAR_MAX = 52;
                const barH = day.count > 0 ? Math.max((day.count / weekMax) * BAR_MAX, 10) : 0;

                return (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                    {/* count label */}
                    <span className="text-[10px] text-[#9A9A9A] leading-none h-3">
                      {day.count > 0 ? day.count : ''}
                    </span>
                    {/* bar area */}
                    <div className="w-full flex items-end justify-center" style={{ height: `${BAR_MAX}px` }}>
                      {day.count > 0 ? (
                        <div
                          className={`w-full rounded-t-md ${day.isToday ? 'bg-[#46E08A]' : 'bg-[#1A1A1A]'}`}
                          style={{ height: `${barH}px` }}
                        />
                      ) : (
                        <div className="w-full border-t-2 border-dashed border-[#E8E8E8]" />
                      )}
                    </div>
                    {/* day label */}
                    <span className={`text-[11px] leading-none ${day.isToday ? 'font-bold text-[#1A1A1A]' : 'text-[#9A9A9A]'}`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── 날짜별 완료 목록 ── */
        <>
          <div className="px-5 mb-2 flex items-center justify-between shrink-0">
            <span className="text-[13px] font-bold text-[#1A1A1A]">
              {month + 1}월 {selectedDay}일 완료
            </span>
            <span className="text-[12px] text-[#9A9A9A]">{dayFiltered.length}개</span>
          </div>

          {dayFiltered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
              <ClipboardList size={36} strokeWidth={1} className="text-[#C0C0C0]" />
              <p className="text-[14px] text-[#9A9A9A]">이 날 완료한 퀘스트가 없어요</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto px-5 pb-4 space-y-2 scrollbar-hide">
              {dayFiltered.map((quest) => {
                const total = quest.subtasks.length;
                const doneCount = quest.subtasks.filter((s) => s.done).length;

                return (
                  <li
                    key={quest.id}
                    className="bg-white border-2 border-[#E0E0E0] rounded-2xl px-4 py-3.5 flex items-center gap-3 opacity-70"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-[#9A9A9A] truncate line-through">
                        {quest.title}
                      </p>
                      {total > 0 && (
                        <p className="text-[12px] text-[#9A9A9A] mt-0.5">{doneCount}/{total} 단계</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
