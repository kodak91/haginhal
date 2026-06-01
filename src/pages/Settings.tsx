import { useState, useEffect } from 'react';
import { type User, signOut, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import type { ReactNode } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { requestNotificationPermission, initFCM } from '../lib/fcm';
import { ChevronRight, X, Copy, Check } from 'lucide-react';

/* ── Constants ──────────────────────────────────────────────────── */
const APP_VERSION = '1.0.0';
const FEEDBACK_EMAIL = 'labangba.pd@gmail.com';
const KAKAOPAY_LINK = 'https://qr.kakaopay.com/FG9lfVXMF4e205136';
// TODO: 실제 계좌번호로 교체
const ACCOUNT_NUMBER = '110-309-931659 신한 양진형';

/* ── Types ──────────────────────────────────────────────────────── */
type CurrentStatus = '' | '직장인' | '프리랜서' | '학생' | '쉬는 중' | '교대근무';
const STATUS_OPTIONS: Exclude<CurrentStatus, ''>[] = [
  '직장인', '프리랜서', '학생', '쉬는 중', '교대근무',
];

interface QuestSettings {
  itemsToCarry: string;
  prepTime: string;
  outingRoutine: string;
  morningRoutine: string;
  eveningRoutine: string;
  currentStatus: CurrentStatus;
}

interface DailyReminder {
  enabled: boolean;
  time: string;
}

interface NotifSettings {
  enabled: boolean;
  dailyReminder: DailyReminder;
  deadlineAlert: boolean;
  overdueReminder: boolean;
}

const DEFAULT_QUEST: QuestSettings = {
  itemsToCarry: '',
  prepTime: '',
  outingRoutine: '',
  morningRoutine: '',
  eveningRoutine: '',
  currentStatus: '',
};

const DEFAULT_NOTIF: NotifSettings = {
  enabled: false,
  dailyReminder: { enabled: false, time: '09:00' },
  deadlineAlert: false,
  overdueReminder: false,
};

type ActiveModal = 'quest' | 'notif' | 'donate' | 'logout' | 'deleteAccount' | null;

/* ── Sub-components ─────────────────────────────────────────────── */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`
        shrink-0 relative w-11 h-6 rounded-full border-2 border-[#1A1A1A]
        transition-colors duration-200
        ${on ? 'bg-[#46E08A]' : 'bg-[#E0E0E0]'}
      `}
    >
      <span
        className={`
          absolute top-0.5 w-4 h-4 rounded-full bg-[#1A1A1A]
          transition-transform duration-200
          ${on ? 'translate-x-5' : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}

function SettingRow({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-4 py-3.5
        bg-white rounded-2xl border-2 transition-colors
        ${danger
          ? 'border-[#E0E0E0] active:bg-[#FFF5F5]'
          : 'border-[#1A1A1A] active:bg-[#F9F9F9]'
        }
      `}
    >
      <span
        className={`text-[15px] font-semibold ${danger ? 'text-red-400' : 'text-[#1A1A1A]'}`}
      >
        {label}
      </span>
      <ChevronRight
        size={16}
        strokeWidth={1.5}
        className={danger ? 'text-[#D0D0D0]' : 'text-[#9A9A9A]'}
      />
    </button>
  );
}

function BottomSheet({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white border-t-2 border-[#1A1A1A] rounded-t-3xl p-5 pb-10 max-h-[85dvh] flex flex-col">
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4 shrink-0" />
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#9A9A9A] active:text-[#1A1A1A] transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
  disabled = false,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-lg bg-white border-t-2 border-[#1A1A1A] rounded-t-3xl p-5 pb-10">
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5" />
        <h2 className="text-[17px] font-bold text-[#1A1A1A] mb-2">{title}</h2>
        <p className="text-[14px] text-[#9A9A9A] leading-relaxed mb-6">{body}</p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`
              w-full py-3.5 rounded-full text-[15px] font-semibold border-2
              active:scale-[0.98] transition-transform disabled:opacity-40
              ${danger
                ? 'bg-red-400 text-white border-red-400'
                : 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
              }
            `}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-full text-[15px] font-semibold border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] active:bg-[#F0F0F0] transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#9A9A9A] mb-1.5 uppercase tracking-wide">
        {label}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="
          w-full border-2 border-[#1A1A1A] rounded-xl
          px-3.5 py-2.5 text-[14px] text-[#1A1A1A]
          outline-none focus:border-[#46E08A] transition-colors bg-white
          placeholder:text-[#C0C0C0] resize-none
        "
      />
    </div>
  );
}

function NotifRow({
  label,
  sub,
  on,
  onChange,
  children,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#1A1A1A]">{label}</p>
          {sub && <p className="text-[12px] text-[#9A9A9A]">{sub}</p>}
        </div>
        <Toggle on={on} onChange={onChange} />
      </div>
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export function Settings({ user }: { user: User }) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [questSettings, setQuestSettings] = useState<QuestSettings>(DEFAULT_QUEST);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notifPermDenied, setNotifPermDenied] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* Load settings from Firestore */
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        if (data['questSettings']) {
          setQuestSettings((prev) => ({
            ...prev,
            ...(data['questSettings'] as Partial<QuestSettings>),
          }));
        }
        if (data['notifSettings']) {
          const ns = data['notifSettings'] as Partial<NotifSettings>;
          setNotifSettings((prev) => ({
            ...prev,
            ...ns,
            dailyReminder: { ...prev.dailyReminder, ...ns.dailyReminder },
          }));
        }
      } catch (e) {
        console.error('설정 로딩 실패:', e);
      }
    };
    void load();
  }, [user.uid]);

  /* Save quest settings */
  const handleSaveQuestSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { questSettings }, { merge: true });
      setActiveModal(null);
      showToast('저장됐어요!');
    } catch (e) {
      console.error('퀘스트 설정 저장 실패:', e);
      showToast('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  /* Save notification settings (auto-save on toggle) */
  const saveNotifSettings = async (updated: NotifSettings) => {
    setNotifSettings(updated);
    try {
      await setDoc(doc(db, 'users', user.uid), { notifSettings: updated }, { merge: true });
    } catch (e) {
      console.error('알림 설정 저장 실패:', e);
    }
  };

  /* Handle global notification toggle with permission check */
  const handleNotifToggle = async (on: boolean) => {
    if (on) {
      if (!('Notification' in window)) {
        showToast('이 브라우저는 알림을 지원하지 않아요');
        return;
      }
      if (Notification.permission === 'denied') {
        setNotifPermDenied(true);
        return;
      }
      if (Notification.permission === 'default') {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setNotifPermDenied(true);
          return;
        }
        await initFCM(user.uid);
      }
    }
    setNotifPermDenied(false);
    await saveNotifSettings({ ...notifSettings, enabled: on });
  };

  /* Logout */
  const handleLogout = async () => {
    await signOut(auth);
  };

  /* Delete account — Firestore data + auth */
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const questsSnap = await getDocs(collection(db, 'users', user.uid, 'quests'));
      await Promise.all(questsSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'users', user.uid));
      try {
        await deleteUser(user);
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(user, googleProvider);
          await deleteUser(user);
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.error('계정 삭제 실패:', e);
      showToast('삭제 중 오류가 발생했어요');
      setDeleting(false);
      setActiveModal(null);
    }
  };

  /* Copy account number */
  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      showToast('복사됐어요');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('복사 실패');
    }
  };

  /* Feedback mailto */
  const handleFeedback = () => {
    const subject = encodeURIComponent('[하긴할거야진짜로] 피드백');
    const body = encodeURIComponent(`앱 버전: v${APP_VERSION}\n\n`);
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-hide">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="flex items-center gap-2 bg-[#46E08A] rounded-full px-4 py-2 text-[13px] font-medium border-2 border-[#1A1A1A] text-[#1A1A1A] whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-8 flex flex-col gap-3">
        <h1 className="text-[17px] font-bold text-[#1A1A1A] mb-1">설정</h1>

        {/* Profile card */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-4 flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="프로필"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full border-2 border-[#E0E0E0] shrink-0 object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full border-2 border-[#E0E0E0] bg-[#F0F0F0] shrink-0 flex items-center justify-center text-[18px] font-bold text-[#9A9A9A]">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#1A1A1A] truncate">
              {user.displayName ?? '이름 없음'}
            </p>
            <p className="text-[12px] text-[#9A9A9A] truncate">{user.email}</p>
          </div>
        </div>

        {/* Main items */}
        <div className="flex flex-col gap-2 mt-1">
          <SettingRow label="퀘스트 설정" onClick={() => setActiveModal('quest')} />
          <SettingRow label="알림 설정" onClick={() => setActiveModal('notif')} />
          <SettingRow label="피드백 보내기" onClick={handleFeedback} />
          <SettingRow label="후원하기 ☕" onClick={() => setActiveModal('donate')} />
        </div>

        {/* Danger zone */}
        <div className="flex flex-col gap-2 mt-1">
          <SettingRow label="로그아웃" onClick={() => setActiveModal('logout')} danger />
          <SettingRow label="계정 삭제" onClick={() => setActiveModal('deleteAccount')} danger />
        </div>

        <p className="text-center text-[11px] text-[#C0C0C0] mt-4">
          하긴할거야진짜로 v{APP_VERSION}
        </p>
      </div>

      {/* ── Quest Settings Modal ─────────────────────────────────── */}
      {activeModal === 'quest' && (
        <BottomSheet onClose={() => setActiveModal(null)} title="퀘스트 설정">
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-1">
            <TextAreaField
              label="나갈 때 꼭 챙기는 것들"
              value={questSettings.itemsToCarry}
              onChange={(v) => setQuestSettings((p) => ({ ...p, itemsToCarry: v }))}
              placeholder="지갑, 폰, 이어폰, 보조배터리, 텀블러"
            />
            <TextAreaField
              label="외출 준비시간"
              value={questSettings.prepTime}
              onChange={(v) => setQuestSettings((p) => ({ ...p, prepTime: v }))}
              placeholder="30분"
              rows={2}
            />
            <TextAreaField
              label="외출 준비 루틴"
              value={questSettings.outingRoutine}
              onChange={(v) => setQuestSettings((p) => ({ ...p, outingRoutine: v }))}
              placeholder="세수, 선크림, 옷 갈아입기, 가방 챙기기"
            />
            <TextAreaField
              label="아침 루틴"
              value={questSettings.morningRoutine}
              onChange={(v) => setQuestSettings((p) => ({ ...p, morningRoutine: v }))}
              placeholder="물 한 잔, 약 먹기, 스트레칭, 이불 정리"
            />
            <TextAreaField
              label="저녁 루틴"
              value={questSettings.eveningRoutine}
              onChange={(v) => setQuestSettings((p) => ({ ...p, eveningRoutine: v }))}
              placeholder="내일 옷 준비, 폰 충전, 일기"
            />

            {/* Current status */}
            <div>
              <p className="text-[11px] font-semibold text-[#9A9A9A] mb-2 uppercase tracking-wide">
                현재 상태
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setQuestSettings((p) => ({
                        ...p,
                        currentStatus: p.currentStatus === s ? '' : s,
                      }))
                    }
                    className={`
                      px-3.5 py-1.5 rounded-full text-[13px] font-semibold border-2 transition-colors
                      ${questSettings.currentStatus === s
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-white text-[#1A1A1A] border-[#1A1A1A] active:bg-[#F0F0F0]'
                      }
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="bg-[#F9F9F9] border border-[#E0E0E0] rounded-xl px-3.5 py-3 text-[12px] text-[#9A9A9A] leading-relaxed">
              {`💡 시간은 '도착'이 아니라 '출발' 기준으로 말해주세요`}
            </div>
          </div>

          <button
            onClick={() => void handleSaveQuestSettings()}
            disabled={saving}
            className="mt-4 shrink-0 w-full py-3.5 rounded-full bg-[#1A1A1A] text-white text-[15px] font-semibold border-2 border-[#1A1A1A] disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </BottomSheet>
      )}

      {/* ── Notification Settings Modal ──────────────────────────── */}
      {activeModal === 'notif' && (
        <BottomSheet
          onClose={() => { setActiveModal(null); setNotifPermDenied(false); }}
          title="알림 설정"
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pb-1">
            {notifPermDenied && (
              <div className="bg-[#FFF5F5] border border-red-200 rounded-xl px-3.5 py-3 text-[12px] text-red-500 leading-relaxed">
                알림 권한이 거부되어 있어요. 브라우저 설정에서 알림을 허용해주세요.
              </div>
            )}
            <NotifRow
              label="전체 알림 켜기"
              sub="모든 알림을 수신해요"
              on={notifSettings.enabled}
              onChange={(v) => void handleNotifToggle(v)}
            />
            <div className={notifSettings.enabled ? '' : 'opacity-40 pointer-events-none'}>
              <div className="flex flex-col gap-3">
                <NotifRow
                  label="매일 할일 작성 리마인더"
                  sub="지정 시각에 알림을 보내요"
                  on={notifSettings.dailyReminder.enabled}
                  onChange={(v) =>
                    void saveNotifSettings({
                      ...notifSettings,
                      dailyReminder: { ...notifSettings.dailyReminder, enabled: v },
                    })
                  }
                >
                  {notifSettings.dailyReminder.enabled && (
                    <input
                      type="time"
                      value={notifSettings.dailyReminder.time}
                      onChange={(e) =>
                        void saveNotifSettings({
                          ...notifSettings,
                          dailyReminder: {
                            ...notifSettings.dailyReminder,
                            time: e.target.value,
                          },
                        })
                      }
                      className="border-2 border-[#1A1A1A] rounded-xl px-3 py-2 text-[14px] font-medium text-[#1A1A1A] bg-white outline-none w-full focus:border-[#46E08A] transition-colors"
                    />
                  )}
                </NotifRow>
                <NotifRow
                  label="기한 설정한 할일 알림"
                  sub="예정 시각에 알림을 보내요"
                  on={notifSettings.deadlineAlert}
                  onChange={(v) =>
                    void saveNotifSettings({ ...notifSettings, deadlineAlert: v })
                  }
                />
                <NotifRow
                  label="기한 지난 할일 리마인더"
                  sub="마감이 지난 할일을 알려줘요"
                  on={notifSettings.overdueReminder}
                  onChange={(v) =>
                    void saveNotifSettings({ ...notifSettings, overdueReminder: v })
                  }
                />
              </div>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── Donate Modal ─────────────────────────────────────────── */}
      {activeModal === 'donate' && (
        <BottomSheet onClose={() => setActiveModal(null)} title="후원하기">
          <div className="flex-1 overflow-y-auto scrollbar-hide pb-1">
            <div className="flex justify-center mb-5">
              <img
                src="/Buy%20Me%20a%20Coffee.png"
                alt="카카오페이 QR"
                className="w-32 h-32 rounded-2xl border-2 border-[#E0E0E0] object-cover"
              />
            </div>
            <p className="text-[19px] font-bold text-[#1A1A1A] mb-3 leading-tight">
              ☕ 베타 기간 개발을<br />응원해주세요
            </p>
            <p className="text-[14px] text-[#5A5A5A] leading-relaxed mb-4">
              지금 후원은 순수 응원이에요.<br />
              기능 잠금이나 대가는 없어요.
            </p>
            <div className="bg-[#F9F9F9] border border-[#E0E0E0] rounded-xl px-4 py-3.5 mb-4">
              <p className="text-[13px] text-[#1A1A1A] leading-loose font-medium">
                그리고 약속할게요 —<br />
                베타를 함께한 분들껜<br />
                정식 출시에도 1년간 무료를 보장합니다.
              </p>
            </div>
            <p className="text-[13px] text-[#9A9A9A] mb-5">이름과 함께 보내주세요.</p>
            <div className="flex flex-col gap-2.5">
              <a
                href={KAKAOPAY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full py-3.5 rounded-full text-center
                  bg-[#46E08A] text-[#1A1A1A] text-[15px] font-bold
                  border-2 border-[#1A1A1A]
                  active:scale-[0.98] transition-transform block
                "
              >
                카카오페이로 보내기
              </a>
              <button
                onClick={() => void handleCopyAccount()}
                className="w-full py-3.5 rounded-full bg-white text-[#1A1A1A] text-[15px] font-semibold border-2 border-[#1A1A1A] flex items-center justify-center gap-2 active:bg-[#F0F0F0] transition-colors"
              >
                {copied ? (
                  <Check size={16} strokeWidth={2} className="text-[#46E08A]" />
                ) : (
                  <Copy size={16} strokeWidth={1.5} />
                )}
                {copied ? '복사됐어요!' : '계좌번호 복사'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── Logout Confirm ───────────────────────────────────────── */}
      {activeModal === 'logout' && (
        <ConfirmSheet
          title="로그아웃할까요?"
          body="다시 로그인하면 데이터가 그대로 있어요."
          confirmLabel="로그아웃"
          onConfirm={() => void handleLogout()}
          onCancel={() => setActiveModal(null)}
        />
      )}

      {/* ── Delete Account Confirm ───────────────────────────────── */}
      {activeModal === 'deleteAccount' && (
        <ConfirmSheet
          title="계정을 삭제할까요?"
          body="모든 퀘스트와 계정이 삭제돼요. 복구할 수 없어요."
          confirmLabel={deleting ? '삭제 중…' : '삭제할게요'}
          danger
          onConfirm={() => void handleDeleteAccount()}
          onCancel={() => setActiveModal(null)}
          disabled={deleting}
        />
      )}
    </div>
  );
}
