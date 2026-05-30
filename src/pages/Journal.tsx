import { useEffect, useRef, useState } from 'react';
import type { Quest, Subtask } from '../types/quest';
import { Zap, GripVertical, X, Plus, ChevronRight } from 'lucide-react';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_LABEL = { high: '급함', medium: '보통', low: '여유' };
const PRIORITY_DOT = { high: 'bg-[#1A1A1A]', medium: 'bg-[#9A9A9A]', low: 'bg-[#D0D0D0]' };

interface EditSubtask {
  id: string;
  title: string;
  done: boolean;
  estimatedMinutes?: number;
}

interface Props {
  quests: Quest[];
  completedQuests: Quest[];
  onComplete: (questId: string) => void;
  onEditSave: (questId: string, title: string, subtasks: Subtask[]) => Promise<void>;
  onReorder: (orderedQuests: Quest[]) => void;
}

export function Journal({ quests, completedQuests, onComplete, onEditSave, onReorder }: Props) {
  const sorted = [...quests].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  // Local display order (optimistic, diverges during drag)
  const [displayItems, setDisplayItems] = useState<Quest[]>(sorted);
  const displayItemsRef = useRef<Quest[]>(displayItems);
  displayItemsRef.current = displayItems;

  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync display with sorted quests when not dragging
  useEffect(() => {
    if (!draggingIdRef.current) setDisplayItems(sorted);
  }, [quests]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editMode, setEditMode] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtasks, setEditSubtasks] = useState<EditSubtask[]>([]);
  const [saving, setSaving] = useState(false);

  const openEdit = (quest: Quest) => {
    setEditingQuest(quest);
    setEditTitle(quest.title);
    setEditSubtasks(quest.subtasks.map((s) => ({ ...s })));
  };
  const closeEdit = () => { setEditingQuest(null); setSaving(false); };
  const addSubtask = () =>
    setEditSubtasks((p) => [...p, { id: crypto.randomUUID(), title: '', done: false }]);
  const removeSubtask = (id: string) =>
    setEditSubtasks((p) => p.filter((s) => s.id !== id));
  const updateSubtaskTitle = (id: string, title: string) =>
    setEditSubtasks((p) => p.map((s) => (s.id === id ? { ...s, title } : s)));

  const handleSave = async () => {
    if (!editingQuest || !editTitle.trim()) return;
    setSaving(true);
    const subtasks: Subtask[] = editSubtasks
      .filter((s) => s.title.trim())
      .map((s) => ({ id: s.id, title: s.title.trim(), done: s.done, estimatedMinutes: s.estimatedMinutes }));
    await onEditSave(editingQuest.id, editTitle.trim(), subtasks);
    closeEdit();
  };

  // ── Drag to reorder ──────────────────────────────────────────────
  const handleGripTouch = (e: React.TouchEvent, questId: string) => {
    e.preventDefault();
    e.stopPropagation();

    draggingIdRef.current = questId;
    setDraggingId(questId);

    const listEl = listRef.current;

    const onMove = (me: TouchEvent) => {
      me.preventDefault();
      if (!listEl || !draggingIdRef.current) return;

      const touch = me.touches[0];
      const listRect = listEl.getBoundingClientRect();
      const children = Array.from(listEl.children) as HTMLElement[];

      // Determine insert slot from touch Y relative to list
      const relY = touch.clientY - listRect.top + listEl.scrollTop;
      let insertIdx = children.length - 1;
      for (let i = 0; i < children.length; i++) {
        if (relY < children[i].offsetTop + children[i].offsetHeight / 2) {
          insertIdx = i;
          break;
        }
      }

      setDisplayItems((prev) => {
        const fromIdx = prev.findIndex((q) => q.id === draggingIdRef.current);
        if (fromIdx === -1 || fromIdx === insertIdx) return prev;
        const arr = [...prev];
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(insertIdx, 0, item);
        return arr;
      });
    };

    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      draggingIdRef.current = null;
      setDraggingId(null);
      onReorder(displayItemsRef.current);
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { once: true });
  };

  // ── Empty state ───────────────────────────────────────────────────
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
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h1 className="text-[17px] font-bold text-[#1A1A1A]">일지</h1>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#9A9A9A]">
              {sorted.length > 0 ? `진행 중 ${sorted.length}개` : ''}
              {sorted.length > 0 && completedQuests.length > 0 ? ' · ' : ''}
              {completedQuests.length > 0 ? `완료 ${completedQuests.length}개` : ''}
            </span>
            {sorted.length > 0 && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`
                  text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors
                  ${editMode
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                    : 'text-[#9A9A9A] border-[#C0C0C0]'}
                `}
              >
                {editMode ? '완료' : '편집'}
              </button>
            )}
          </div>
        </div>

        <ul ref={listRef} className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-hide">
          {/* Active quests */}
          {displayItems.map((quest) => {
            const doneCount = quest.subtasks.filter((s) => s.done).length;
            const total = quest.subtasks.length;
            const isDragging = draggingId === quest.id;

            const metaStr = [
              PRIORITY_LABEL[quest.priority],
              total > 0 ? `${doneCount}/${total}` : null,
              `${quest.estimatedMinutes}분`,
            ].filter(Boolean).join(' · ');

            return (
              <li
                key={quest.id}
                onClick={() => { if (editMode) openEdit(quest); }}
                className={`
                  bg-white border-2 border-[#1A1A1A] rounded-2xl px-3 py-3.5
                  flex items-center gap-2.5 mb-2
                  transition-all duration-150
                  ${isDragging ? 'opacity-50 scale-[0.98] shadow-lg' : ''}
                  ${editMode ? 'cursor-pointer active:bg-[#F9F9F9]' : ''}
                `}
              >
                {/* Left: grip (edit) or checkbox (normal) */}
                {editMode ? (
                  <button
                    onTouchStart={(e) => handleGripTouch(e, quest.id)}
                    className="shrink-0 p-1 text-[#C0C0C0] touch-none cursor-grab active:cursor-grabbing"
                    aria-label="드래그해서 순서 변경"
                  >
                    <GripVertical size={18} strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplete(quest.id); }}
                    aria-label="완료"
                    className="
                      shrink-0 w-6 h-6 rounded-full border-2 border-[#1A1A1A]
                      flex items-center justify-center
                      active:bg-[#46E08A] transition-colors
                    "
                  />
                )}

                {/* Title */}
                <p className="flex-1 text-[15px] font-semibold text-[#1A1A1A] truncate">
                  {quest.title}
                </p>

                {/* Right: meta */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[quest.priority]}`} />
                  <span className="text-[12px] text-[#9A9A9A] whitespace-nowrap">{metaStr}</span>
                  {editMode && (
                    <ChevronRight size={14} strokeWidth={1.5} className="text-[#C0C0C0] ml-0.5" />
                  )}
                </div>
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

          {/* Completed quests */}
          {completedQuests.map((quest) => (
            <li
              key={quest.id}
              className="bg-[#F0F0F0] border-2 border-[#E0E0E0] rounded-2xl px-4 py-3 flex items-center gap-3 mb-2 opacity-60"
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#C0C0C0] flex items-center justify-center">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
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

      {/* Edit modal */}
      {editingQuest && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="w-full max-w-lg bg-white border-t-2 border-[#1A1A1A] rounded-t-3xl p-5 pb-10 max-h-[85dvh] flex flex-col">
            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-[#1A1A1A]">퀘스트 편집</h2>
              <button onClick={closeEdit} className="p-1 text-[#9A9A9A]">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-[#9A9A9A] mb-1.5 uppercase tracking-wide">제목</p>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="
                    w-full border-2 border-[#1A1A1A] rounded-xl
                    px-3.5 py-2.5 text-[15px] font-medium text-[#1A1A1A]
                    outline-none focus:border-[#46E08A] transition-colors bg-white
                  "
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#9A9A9A] mb-1.5 uppercase tracking-wide">세부 미션</p>
                <ul className="space-y-2">
                  {editSubtasks.map((s, idx) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full border-2 border-[#E0E0E0] flex items-center justify-center text-[10px] text-[#9A9A9A]">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={s.title}
                        onChange={(e) => updateSubtaskTitle(s.id, e.target.value)}
                        placeholder={`세부 미션 ${idx + 1}`}
                        className="
                          flex-1 border border-[#E0E0E0] rounded-xl
                          px-3 py-2 text-[14px] text-[#1A1A1A]
                          outline-none focus:border-[#1A1A1A] transition-colors bg-[#F9F9F9]
                          placeholder:text-[#C0C0C0]
                        "
                      />
                      <button
                        onClick={() => removeSubtask(s.id)}
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#C0C0C0] active:text-red-400 transition-colors"
                      >
                        <X size={13} strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={addSubtask}
                  className="
                    mt-2 w-full flex items-center justify-center gap-1.5 py-2
                    rounded-xl border border-dashed border-[#C0C0C0]
                    text-[13px] text-[#9A9A9A]
                    active:border-[#1A1A1A] active:text-[#1A1A1A] transition-colors
                  "
                >
                  <Plus size={13} strokeWidth={1.5} />
                  미션 추가
                </button>
              </div>
            </div>

            <button
              onClick={() => void handleSave()}
              disabled={saving || !editTitle.trim()}
              className="
                mt-4 w-full py-3.5 rounded-full
                bg-[#1A1A1A] text-white text-[15px] font-semibold
                border-2 border-[#1A1A1A] disabled:opacity-40
                active:scale-[0.98] transition-transform
              "
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
