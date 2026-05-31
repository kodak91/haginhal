import { useEffect, useRef, useState } from 'react';
import { type User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { processVoiceInput } from './lib/claude';
import { requestNotificationPermission, initFCM, scheduleQuestNotification } from './lib/fcm';
import type { AIResponse, AISubtaskItem, Quest, QuestLocation, Subtask } from './types/quest';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Journal } from './pages/Journal';
import { History } from './pages/History';
import { BottomNav } from './components/BottomNav';
import type { Page } from './components/BottomNav';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { Loader2 } from 'lucide-react';

function Settings() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <p className="text-[18px] font-semibold text-[#1A1A1A]">설정</p>
      <p className="text-[14px] text-[#9A9A9A]">Phase 3에서 만나요</p>
    </div>
  );
}

/** location → 레거시 category 파생 (Firestore 하위호환) */
function locationToCategory(location: QuestLocation): '실내' | '외출' {
  return ['밖', '회사', '학교'].includes(location) ? '외출' : '실내';
}

function makeSubtasks(items: AISubtaskItem[]): Subtask[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    done: false,
    estimatedMinutes: item.estimatedMinutes,
  }));
}

function computeScheduledAt(timeOfDay: Quest['timeOfDay']): Date | null {
  const hours: Record<string, number | null> = {
    '오전': 9, '오후': 14, '저녁': 19, '미정': null,
  };
  const hour = hours[timeOfDay];
  if (hour === null) return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
  return d.getTime() > now.getTime() ? d : null;
}

function questsCol(uid: string) {
  return collection(db, 'users', uid, 'quests');
}

function MainApp({ user }: { user: User }) {
  const [page, setPage] = useState<Page>('home');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'ok' } | null>(null);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Track scheduled notification timeouts (questId → timeoutId)
  const scheduledNotifs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const questsRef = useRef(quests);
  questsRef.current = quests;

  const showToast = (msg: string, type: 'error' | 'ok' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Active quests listener
  useEffect(() => {
    const q = query(questsCol(user.uid), where('done', '==', false));
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
          .sort((a, b) => a.order - b.order);
        setQuests(list);
        setCurrentIndex((prev) => Math.min(prev, Math.max(0, list.length - 1)));
      },
      (err) => {
        console.error('Firestore 에러:', err);
        showToast('데이터 로딩 실패: ' + err.message);
      }
    );
  }, [user.uid]);

  // Completed quests listener
  useEffect(() => {
    const q = query(questsCol(user.uid), where('done', '==', true));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            scheduledAt: data.scheduledAt?.toDate?.() ?? null,
            completedAt: data.completedAt?.toDate?.() ?? undefined,
          } as Quest;
        })
        .sort((a, b) => {
          const aDate = a.completedAt ?? a.createdAt;
          const bDate = b.completedAt ?? b.createdAt;
          return bDate.getTime() - aDate.getTime();
        });
      setCompletedQuests(list);
    });
  }, [user.uid]);

  const handleVoiceInput = async (text: string): Promise<void> => {
    setIsProcessing(true);
    try {
      const result: AIResponse = await processVoiceInput(text, questsRef.current);

      if (result.action === 'create') {
        const isFirstQuest = questsRef.current.length === 0;
        const maxOrder =
          questsRef.current.length > 0
            ? Math.max(...questsRef.current.map((q) => q.order))
            : 0;

        for (let i = 0; i < result.quests.length; i++) {
          const q = result.quests[i];
          const scheduledAt = computeScheduledAt(q.timeOfDay);
          const ref = await addDoc(questsCol(user.uid), {
            title: q.title,
            location: q.location,
            category: locationToCategory(q.location), // 하위호환
            timeOfDay: q.timeOfDay,
            estimatedMinutes: q.estimatedMinutes,
            priority: q.priority,
            subtasks: makeSubtasks(q.subtasks),
            done: false,
            order: maxOrder + i + 1,
            createdAt: serverTimestamp(),
            scheduledAt: scheduledAt ?? null,
          });

          // Schedule local notification
          if (scheduledAt && Notification.permission === 'granted') {
            const tid = scheduleQuestNotification(
              { id: ref.id, title: q.title, scheduledAt } as Quest,
              () => questsRef.current.length
            );
            if (tid) scheduledNotifs.current.set(ref.id, tid);
          }
        }

        setPage('home');
        showToast('퀘스트 추가됐어요!', 'ok');

        // Show notification permission modal after first quest (once)
        if (isFirstQuest && !localStorage.getItem('notifAsked')) {
          setTimeout(() => setShowNotifModal(true), 600);
        }

      } else if (result.action === 'rearrange') {
        for (const update of result.updates) {
          const fields: Record<string, unknown> = {};
          if (update.timeOfDay) {
            fields.timeOfDay = update.timeOfDay;
            const newScheduledAt = computeScheduledAt(update.timeOfDay);
            fields.scheduledAt = newScheduledAt ?? null;
          }
          if (update.order !== undefined) fields.order = update.order;
          if (Object.keys(fields).length > 0) {
            await updateDoc(doc(db, 'users', user.uid, 'quests', update.id), fields);
          }
        }
        showToast('재배치했어요!', 'ok');

      } else if (result.action === 'delete') {
        clearTimeout(scheduledNotifs.current.get(result.targetId));
        scheduledNotifs.current.delete(result.targetId);
        await deleteDoc(doc(db, 'users', user.uid, 'quests', result.targetId));
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        showToast('삭제했어요', 'ok');

      } else if (result.action === 'resubtask') {
        const newSubtasks = result.subtasks.map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          done: false,
          estimatedMinutes: s.estimatedMinutes,
        }));
        await updateDoc(doc(db, 'users', user.uid, 'quests', result.targetId), {
          subtasks: newSubtasks,
        });
        showToast('세부 미션 재구성했어요!', 'ok');

      } else if (result.action === 'complete') {
        await handleComplete(quests[currentIndex]?.id ?? '');

      } else if (result.action === 'update') {
        const { targetId, changes } = result;
        const fields: Record<string, unknown> = {};
        if (changes.title) fields.title = changes.title;
        if (changes.location) {
          fields.location = changes.location;
          fields.category = locationToCategory(changes.location);
        }
        if (changes.timeOfDay) {
          fields.timeOfDay = changes.timeOfDay;
          fields.scheduledAt = computeScheduledAt(changes.timeOfDay) ?? null;
        }
        if (changes.priority) fields.priority = changes.priority;
        if (Object.keys(fields).length > 0) {
          await updateDoc(doc(db, 'users', user.uid, 'quests', targetId), fields);
          showToast('수정했어요!', 'ok');
        }

      } else if (result.action === 'add_subtask') {
        const quest = questsRef.current.find((q) => q.id === result.targetId);
        if (quest) {
          const newSubtask: Subtask = {
            id: crypto.randomUUID(),
            title: result.subtask.title,
            done: false,
            estimatedMinutes: result.subtask.estimatedMinutes,
          };
          await updateDoc(doc(db, 'users', user.uid, 'quests', result.targetId), {
            subtasks: [...quest.subtasks, newSubtask],
          });
          showToast('세부 항목 추가했어요!', 'ok');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      console.error('handleVoiceInput 에러:', err);
      showToast('오류: ' + msg);
      throw err;
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

  const handleComplete = async (questId: string) => {
    if (!questId) return;
    clearTimeout(scheduledNotifs.current.get(questId));
    scheduledNotifs.current.delete(questId);
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), {
      done: true,
      completedAt: serverTimestamp(),
    });
    showToast('완료! 잘 했어요 🎉', 'ok');
  };

  const handleRestore = async (questId: string) => {
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), {
      done: false,
      completedAt: deleteField(),
    });
    showToast('다시 목록으로 올렸어요', 'ok');
  };

  const handleDeleteQuest = async (questId: string) => {
    clearTimeout(scheduledNotifs.current.get(questId));
    scheduledNotifs.current.delete(questId);
    await deleteDoc(doc(db, 'users', user.uid, 'quests', questId));
    showToast('삭제했어요', 'ok');
  };

  const handleReorder = (orderedQuests: Quest[]) => {
    void Promise.all(
      orderedQuests.map((q, i) =>
        updateDoc(doc(db, 'users', user.uid, 'quests', q.id), { order: i + 1 })
      )
    );
  };

  const handleEditSave = async (questId: string, title: string, subtasks: Subtask[]) => {
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), { title, subtasks });
    showToast('저장됐어요!', 'ok');
  };

  const handleDefer = async (questId: string) => {
    const maxOrder =
      quests.length > 0 ? Math.max(...quests.map((q) => q.order)) : 0;
    await updateDoc(doc(db, 'users', user.uid, 'quests', questId), {
      order: maxOrder + 1000,
    });
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, quests.length - 2)));
  };

  const handleNotifAllow = async () => {
    setShowNotifModal(false);
    localStorage.setItem('notifAsked', 'true');
    const granted = await requestNotificationPermission();
    if (granted) {
      await initFCM(user.uid);
      // Save notification preference to Firestore
      await setDoc(doc(db, 'users', user.uid), { notifEnabled: true }, { merge: true });
      showToast('알림이 설정됐어요!', 'ok');
    }
  };

  const handleNotifLater = () => {
    setShowNotifModal(false);
    localStorage.setItem('notifAsked', 'true');
  };

  return (
    <div className="flex flex-col bg-[#F2F2F2]" style={{ height: '100dvh' }}>
      {/* Processing indicator */}
      {isProcessing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-2">
            <Loader2 size={14} className="animate-spin text-[#46E08A]" />
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
              border-2 border-[#1A1A1A]
              ${toast.type === 'ok' ? 'bg-[#46E08A] text-[#1A1A1A]' : 'bg-white text-red-500'}
            `}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* Notification permission modal */}
      {showNotifModal && (
        <NotificationPermissionModal
          onAllow={() => void handleNotifAllow()}
          onLater={handleNotifLater}
        />
      )}

      <main className="flex-1 overflow-hidden pb-16">
        {page === 'home' && (
          <Home
            quests={quests}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onSubtaskToggle={handleSubtaskToggle}
            onDefer={handleDefer}
            onComplete={handleComplete}
          />
        )}
        {page === 'journal' && (
          <Journal
            quests={quests}
            completedQuests={completedQuests}
            onComplete={handleComplete}
            onEditSave={handleEditSave}
            onReorder={handleReorder}
            onRestore={handleRestore}
            onDelete={handleDeleteQuest}
          />
        )}
        {page === 'history' && <History completedQuests={completedQuests} />}
        {page === 'settings' && <Settings />}
      </main>

      <BottomNav
        currentPage={page}
        onNavigate={setPage}
        onVoiceInput={handleVoiceInput}
        hasQuests={quests.length > 0}
      />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // signInWithRedirect 후 돌아왔을 때 결과 처리
    getRedirectResult(auth).catch((e) => console.warn('redirect result:', e));

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center bg-[#F2F2F2]"
        style={{ height: '100dvh' }}
      >
        <Loader2 size={28} className="animate-spin text-[#46E08A]" strokeWidth={1.5} />
      </div>
    );
  }

  if (!user) {
    return showLogin
      ? <Login />
      : <Landing onStart={() => setShowLogin(true)} />;
  }

  return <MainApp user={user} />;
}
