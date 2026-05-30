import { useEffect, useState } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
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

  useEffect(() => {
    const q = query(
      questsCol(user.uid),
      where('done', '==', false),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          scheduledAt: data.scheduledAt?.toDate?.() ?? null,
        } as Quest;
      });
      setQuests(list);
      setCurrentIndex((prev) => Math.min(prev, Math.max(0, list.length - 1)));
    });
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
      } else if (result.action === 'complete') {
        const target = quests[currentIndex];
        if (target) {
          await updateDoc(doc(db, 'users', user.uid, 'quests', target.id), {
            done: true,
          });
        }
      }
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
