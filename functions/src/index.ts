import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();
const db        = getFirestore();
const messaging = getMessaging();

/* ── FCM send helper ────────────────────────────────────────────── */

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

async function sendFCM(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  uid: string
): Promise<boolean> {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          icon:    '/icon-192.png',
          badge:   '/icon-192.png',
          vibrate: [200, 100, 200],
        },
        fcmOptions: { link: '/' },
      },
    });
    return true;
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? '';
    if (INVALID_TOKEN_CODES.has(code)) {
      // Stale token — clean up so we don't retry
      await db.doc(`users/${uid}`).update({ fcmToken: FieldValue.delete() }).catch(() => {});
    } else {
      console.error(`FCM send failed uid=${uid}:`, e);
    }
    return false;
  }
}

/* ── Stage B: HTTP test push ────────────────────────────────────── */
// Usage: GET https://<region>-<project>.cloudfunctions.net/testPush?uid=<uid>

export const testPush = onRequest(
  { timeoutSeconds: 30, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).send('Method not allowed');
      return;
    }

    const uid = req.query['uid'] as string | undefined;
    if (!uid) {
      res.status(400).send('uid query param required\nUsage: ?uid=<firebase-user-uid>');
      return;
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      res.status(404).send(`User ${uid} not found`);
      return;
    }

    const fcmToken = userSnap.data()?.['fcmToken'] as string | undefined;
    if (!fcmToken) {
      res.status(404).send('No FCM token for this user — open the app first to register');
      return;
    }

    const ok = await sendFCM(
      fcmToken,
      '하긴해야할 시간입니다!',
      '테스트 푸시 발송 성공 ✅',
      { type: 'test', uid },
      uid
    );
    res.send(ok ? `sent ok to uid=${uid}` : `send failed — check logs`);
  }
);

/* ── Stage C: Scheduled notifications (every 1 min) ─────────────── */
// Requires composite indexes — deploy first:
//   firebase deploy --only firestore:indexes

export const scheduledNotifications = onSchedule(
  { schedule: '* * * * *', timeoutSeconds: 540 },
  async () => {
    const now = new Date();

    // ── 1. Quest deadline alerts ─────────────────────────────────
    // Window: [now − 30s, now + 90s]  →  captures "this minute"
    const windowStart = Timestamp.fromDate(new Date(now.getTime() - 30_000));
    const windowEnd   = Timestamp.fromDate(new Date(now.getTime() + 90_000));

    const deadlineSnap = await db
      .collectionGroup('quests')
      .where('done',        '==', false)
      .where('scheduledAt', '>=', windowStart)
      .where('scheduledAt', '<=', windowEnd)
      .get();

    for (const questDoc of deadlineSnap.docs) {
      if (questDoc.data()['notified']) continue;

      const uid = questDoc.ref.parent.parent?.id;
      if (!uid) continue;

      const userSnap = await db.doc(`users/${uid}`).get();
      const user = userSnap.data();
      if (!user?.['notifSettings']?.enabled)       continue;
      if (!user['notifSettings']?.deadlineAlert)   continue;

      const fcmToken = user['fcmToken'] as string | undefined;
      if (!fcmToken) continue;

      const activeCount = (
        await db.collection(`users/${uid}/quests`).where('done', '==', false).count().get()
      ).data().count;

      const sent = await sendFCM(
        fcmToken,
        '하긴해야할 시간입니다!',
        `${questDoc.data()['title'] as string} • 남은 퀘스트 ${activeCount}개`,
        { questId: questDoc.id, type: 'quest', uid },
        uid
      );
      if (sent) await questDoc.ref.update({ notified: true });
    }

    // ── 2. Overdue reminder ──────────────────────────────────────
    // Quests past deadline by > 10 min, not yet notified
    const overdueThreshold = Timestamp.fromDate(new Date(now.getTime() - 10 * 60_000));

    const overdueSnap = await db
      .collectionGroup('quests')
      .where('done',        '==', false)
      .where('notified',    '==', false)
      .where('scheduledAt', '<=', overdueThreshold)
      .get();

    for (const questDoc of overdueSnap.docs) {
      const uid = questDoc.ref.parent.parent?.id;
      if (!uid) continue;

      const userSnap = await db.doc(`users/${uid}`).get();
      const user = userSnap.data();
      if (!user?.['notifSettings']?.enabled)         continue;
      if (!user['notifSettings']?.overdueReminder)   continue;

      const fcmToken = user['fcmToken'] as string | undefined;
      if (!fcmToken) continue;

      const sent = await sendFCM(
        fcmToken,
        '아직 못 한 일이 있어요',
        `${questDoc.data()['title'] as string} — 잊으면 안 되겠죠?`,
        { questId: questDoc.id, type: 'overdue', uid },
        uid
      );
      if (sent) await questDoc.ref.update({ notified: true });
    }

    // ── 3. Daily reminder ────────────────────────────────────────
    // Compare KST HH:MM against user's configured time
    const kstNow  = new Date(now.getTime() + 9 * 3_600_000);
    const kstHH   = String(kstNow.getUTCHours()).padStart(2, '0');
    const kstMM   = String(kstNow.getUTCMinutes()).padStart(2, '0');
    const kstTime = `${kstHH}:${kstMM}`;
    const kstDate = kstNow.toISOString().slice(0, 10); // YYYY-MM-DD

    const usersSnap = await db.collection('users')
      .where('notifSettings.enabled',                '==', true)
      .where('notifSettings.dailyReminder.enabled',  '==', true)
      .where('notifSettings.dailyReminder.time',     '==', kstTime)
      .get();

    for (const userDoc of usersSnap.docs) {
      // Dedup: send at most once per day
      if (userDoc.data()['lastDailyReminderSent'] === kstDate) continue;

      const fcmToken = userDoc.data()['fcmToken'] as string | undefined;
      if (!fcmToken) continue;

      const sent = await sendFCM(
        fcmToken,
        '하긴할거야진짜로',
        '지금 안해두면 까먹어요! 오늘 할 일을 작성해볼까요?',
        { type: 'daily_reminder', uid: userDoc.id },
        userDoc.id
      );
      if (sent) await userDoc.ref.update({ lastDailyReminderSent: kstDate });
    }
  }
);
