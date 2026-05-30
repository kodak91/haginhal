import { useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { processVoiceInput } from './lib/claude';
import type { AIResponse, Quest, Subtask } from './types/quest';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Calendar } from './pages/Calendar';
import { History } from './pages/History';
import { BottomNav } from './components/BottomNav';
import type { Page } from './components/BottomNav';
import { Loader2 } from 'lucide-react';

function Settings() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <p className="text-[18px] font-semibold text-[#1A1A1A]">설정</p>
      <p className="text-[14px] text-[#9A9A9A]">Phase 3에서 만나요</p>
    </div>
  );
}

function makeSubtasks(titles: string[]): Subtask[] {
  return titles.map((title) => ({
    id: crypto.randomUUID(),
    title,
    done: false,
  }));
}

function questsCol(uid: string) {
  return collection(db, 'users', uid, 'quests');
}

function MainApp({ user }: { user: User }) {
  const [page, setPage] = useState<Page>('home');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'ok' } | null>(null);

  const showToast = (msg: string, type: 'error' | 'ok' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // orderBy 제거 → 복합 인덱스 불필요, 클라이언트에서 정렬
    const q = query(
      questsCol(user.uid),
      where('done', '==', false)
    );
    return onSnapshot(
      q,
      (snap) => {
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
          .sort((a, b) => a.order - b.order); // 클라이언트 정렬
        setQuests(list);
        setCurrentIndex((prev) => Math.min(prev, Math.max(0, list.length - 1)));
      },
      (err) => {
        console.error('Firestore 에러:', err);
        showToast('데이터 로딩 실패: ' + err.message);
      }
    );
  }, [user.uid]);

  const handleVoiceInput = async (text: string): Promise<void> => {
    setIsProcessing(true);
    try {
      const result: AIResponse = await processVoiceInput(text);

      if (result.action === 'create') {
        const maxOrder =
          quests.length > 0 ? Math.max(...quests.map((q) => q.order)) : 0;
        for (let i = 0; i < result.quests.length; i++) {
          const q = result.quests[i];
          await addDoc(questsCol(user.uid), {
            title: q.title,
            category: q.category,
            timeOfDay: q.timeOfDay,
            estimatedMinutes: q.estimatedMinutes,
            priority: q.priority,
            subtasks: makeSubtasks(q.subtasks),
            done: false,
            order: maxOrder + i + 1,
            createdAt: serverTimestamp(),
            scheduledAt: null,
          });
        }
        setPage('home');
        showToast('퀘스트 추가됐어요!', 'ok');
      } else if (result.action === 'complete') {
        const target = quests[currentIndex];
        if (target) {
          await updateDoc(doc(db, 'users', user.uid, 'quests', target.id), {
            done: true,
          });
          showToast('완료!', 'ok');
        }
      } else if (result.action === 'update') {
        showToast('수정 기능은 Phase 2에서 추가돼요');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      console.error('handleVoiceInput 에러:', err);
      showToast('오류: ' + msg);
      throw err; // VoiceButton의 에러 UI도 표시
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubtaskToggle = async (questId: string, subtaskId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;
    if (navigator.vibrate) navigator.vibrate(30);
    const updated = quest.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    );
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), {
      subtasks: updated,
    });
  };

  const handleDefer = async (questId: string) => {
    const maxOrder =
      quests.length > 0 ? Math.max(...quests.map((q) => q.order)) : 0;
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), {
      order: maxOrder + 1000,
    });
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, quests.length - 2)));
  };

  return (
    <div className="flex flex-col bg-[#F5F0E8]" style={{ height: '100dvh' }}>
      {/* Processing indicator */}
      {isProcessing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-white border-[1.5px] border-[#1A1A1A] rounded-full px-4 py-2">
            <Loader2 size={14} className="animate-spin text-[#C8B89A]" />
            <span className="text-[13px] font-medium text-[#1A1A1A]">
              AI가 분석 중이에요
            </span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`
              flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium
              border-[1.5px] border-[#1A1A1A]
              ${toast.type === 'ok' ? 'bg-[#C8B89A] text-[#1A1A1A]' : 'bg-white text-red-500'}
            `}
          >
            {toast.msg}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden pb-16">
        {page === 'home' && (
          <Home
            quests={quests}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onSubtaskToggle={handleSubtaskToggle}
            onDefer={handleDefer}
          />
        )}
        {page === 'calendar' && <Calendar />}
        {page === 'history' && <History />}
        {page === 'settings' && <Settings />}
      </main>

      <BottomNav
        currentPage={page}
        onNavigate={setPage}
        onVoiceInput={handleVoiceInput}
      />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center bg-[#F5F0E8]"
        style={{ height: '100dvh' }}
      >
        <Loader2 size={28} className="animate-spin text-[#C8B89A]" strokeWidth={1.5} />
      </div>
    );
  }

  return user ? <MainApp user={user} /> : <Login />;
}
