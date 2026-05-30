import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Quest } from '../types/quest';
import { ClipboardList } from 'lucide-react';

interface Props {
  userId: string;
}

export function History({ userId }: Props) {
  const [completed, setCompleted] = useState<Quest[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'users', userId, 'quests'),
      where('done', '==', true)
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            scheduledAt: data.scheduledAt?.toDate?.() ?? null,
          } as Quest;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setCompleted(list);
    });
  }, [userId]);

  if (completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <ClipboardList size={40} strokeWidth={1} className="text-[#C8B89A]" />
        <p className="text-[17px] font-semibold text-[#1A1A1A]">완료한 퀘스트가 없어요</p>
        <p className="text-[14px] text-[#9A9A9A]">하나씩 해치워 봐요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-[#1A1A1A]">히스토리</h1>
        <span className="text-[13px] text-[#9A9A9A]">{completed.length}개 완료</span>
      </div>

      <ul className="flex-1 overflow-y-auto px-5 pb-4 space-y-2 scrollbar-hide">
        {completed.map((quest) => {
          const total = quest.subtasks.length;
          const doneCount = quest.subtasks.filter((s) => s.done).length;
          const date = quest.createdAt
            ? new Date(quest.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            : '';

          return (
            <li
              key={quest.id}
              className="
                bg-white border-[1.5px] border-[#E0E0E0] rounded-2xl
                px-4 py-3.5 flex items-center gap-3 opacity-70
              "
            >
              {/* Done check */}
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[#1A1A1A] truncate line-through decoration-[#9A9A9A]">
                  {quest.title}
                </p>
                {total > 0 && (
                  <p className="text-[12px] text-[#9A9A9A] mt-0.5">
                    {doneCount}/{total} 단계
                  </p>
                )}
              </div>

              <span className="shrink-0 text-[12px] text-[#9A9A9A]">{date}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
