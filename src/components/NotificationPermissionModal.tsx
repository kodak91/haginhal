import { Bell } from 'lucide-react';

interface Props {
  onAllow: () => void;
  onLater: () => void;
}

export function NotificationPermissionModal({ onAllow, onLater }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs bg-white border-2 border-[#1A1A1A] rounded-3xl p-6 text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#46E08A] border-2 border-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
          <Bell size={24} strokeWidth={1.5} className="text-[#1A1A1A]" />
        </div>
        <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-2">
          알림 받기
        </h2>
        <p className="text-[14px] text-[#9A9A9A] leading-relaxed mb-6">
          할 일 시작 시간에<br />알려드릴까요?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onAllow}
            className="
              w-full py-3.5 rounded-full
              bg-[#1A1A1A] text-white
              text-[15px] font-semibold
              border-2 border-[#1A1A1A]
              active:scale-[0.98] transition-transform
            "
          >
            허용
          </button>
          <button
            onClick={onLater}
            className="w-full py-2.5 text-[14px] text-[#9A9A9A]"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
