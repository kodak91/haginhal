import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from './firebase';
import type { Quest } from '../types/quest';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function initFCM(uid: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !VAPID_KEY) return;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log('[FCM] token obtained:', token);
      await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true });
      console.log('[FCM] token saved to Firestore uid=', uid);
    } else {
      console.warn('[FCM] getToken returned empty — check VAPID key or SW registration');
    }
  } catch (e) {
    console.warn('[FCM] init failed:', e);
  }
}

// Schedule a local browser notification at quest's scheduledAt time.
// Returns the timer ID so the caller can cancel if needed.
export function scheduleQuestNotification(
  quest: Quest,
  getActiveCount: () => number
): ReturnType<typeof setTimeout> | null {
  if (!quest.scheduledAt || Notification.permission !== 'granted') return null;
  const delay = quest.scheduledAt.getTime() - Date.now();
  if (delay <= 0) return null;

  return setTimeout(() => {
    // 포그라운드에서 로컬 알림 발생 시 직접 사운드 재생
    try {
      const alarm = new Audio('/app_alarm.wav');
      alarm.play().catch(() => {});
    } catch { /* autoplay 차단 무시 */ }

    new Notification('하긴해야할 시간입니다!', {
      body: `${quest.title} • 남은 퀘스트 ${getActiveCount()}개`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `quest-${quest.id}`,
      silent: false,
    } as NotificationOptions);
  }, delay);
}
