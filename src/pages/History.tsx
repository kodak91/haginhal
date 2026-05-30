import { ClipboardList } from 'lucide-react';

export function History() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <ClipboardList size={48} strokeWidth={1} className="text-[#C8B89A]" />
      <p className="text-[18px] font-semibold text-[#1A1A1A]">히스토리</p>
      <p className="text-[14px] text-[#9A9A9A]">Phase 3에서 만나요</p>
    </div>
  );
}
