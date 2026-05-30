import { useRef, useState } from 'react';
import type { Quest } from '../types/quest';
import { QuestCard } from '../components/QuestCard';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  quests: Quest[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  onSubtaskToggle: (questId: string, subtaskId: string) => void;
  onDefer: (questId: string) => void;
  onComplete: (questId: string) => void;
}

export function Home({
  quests,
  currentIndex,
  onIndexChange,
  onSubtaskToggle,
  onDefer,
  onComplete,
}: Props) {
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    // Limit drag to ±80px for feel
    setSwipeDelta(Math.max(-80, Math.min(80, delta)));
  };

  const handleTouchEnd = () => {
    if (animating) return;

    if (swipeDelta < -50 && currentIndex < quests.length - 1) {
      setAnimating(true);
      onIndexChange(currentIndex + 1);
      setTimeout(() => setAnimating(false), 300);
    } else if (swipeDelta > 50 && currentIndex > 0) {
      setAnimating(true);
      onIndexChange(currentIndex - 1);
      setTimeout(() => setAnimating(false), 300);
    }
    setSwipeDelta(0);
  };

  /* ── Empty state ───────────────────────────────────────────── */
  if (quests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <CheckCircle2 size={48} strokeWidth={1} className="text-[#C8B89A]" />
        <p className="text-[18px] font-semibold text-[#1A1A1A]">
          오늘 할 일이 없어요
        </p>
        <p className="text-[14px] text-[#9A9A9A] leading-relaxed">
          아래 버튼을 눌러<br />할 일을 추가해 보세요
        </p>
      </div>
    );
  }

  const doneTotal = quests.reduce(
    (acc, q) => acc + q.subtasks.filter((s) => s.done).length,
    0
  );
  const subtaskTotal = quests.reduce((acc, q) => acc + q.subtasks.length, 0);
  const quest = quests[currentIndex];

  return (
    <div className="flex flex-col h-full select-none">
      {/* Global progress */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <span className="text-[13px] text-[#9A9A9A]">
          오늘의 퀘스트
        </span>
        {subtaskTotal > 0 && (
          <span className="text-[13px] font-medium text-[#1A1A1A]">
            {doneTotal}/{subtaskTotal} 완료
          </span>
        )}
      </div>

      {/* Swipeable card area */}
      <div
        className="flex-1 px-5 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translateX(${swipeDelta}px)`,
            transition: swipeDelta === 0 ? 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' : 'none',
            opacity: Math.max(0.7, 1 - Math.abs(swipeDelta) / 200),
            height: '100%',
          }}
        >
          {quest && (
            <QuestCard
              quest={quest}
              onSubtaskToggle={(subtaskId) => onSubtaskToggle(quest.id, subtaskId)}
              onDefer={() => onDefer(quest.id)}
              onComplete={() => onComplete(quest.id)}
            />
          )}
        </div>
      </div>

      {/* Dot pagination */}
      <div className="flex items-center justify-center gap-2 py-4">
        {quests.map((_, i) => (
          <button
            key={i}
            onClick={() => onIndexChange(i)}
            aria-label={`퀘스트 ${i + 1}`}
            className={`
              rounded-full transition-all duration-200
              ${i === currentIndex
                ? 'w-4 h-2 bg-[#1A1A1A]'
                : 'w-2 h-2 bg-[#1A1A1A] opacity-20'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}
