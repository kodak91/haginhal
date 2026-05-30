import { Home, Calendar, ClipboardList, Settings } from 'lucide-react';
import { VoiceButton } from './VoiceButton';

export type Page = 'home' | 'calendar' | 'history' | 'settings';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-1 min-w-[44px] transition-opacity"
      aria-label={label}
    >
      <span className={active ? 'text-[#1A1A1A]' : 'text-[#9A9A9A]'}>
        {icon}
      </span>
      <span
        className={`text-[10px] font-medium ${active ? 'text-[#1A1A1A]' : 'text-[#9A9A9A]'}`}
      >
        {label}
      </span>
    </button>
  );
}

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onVoiceInput: (text: string) => Promise<void>;
}

export function BottomNav({ currentPage, onNavigate, onVoiceInput }: Props) {
  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-[#F5F0E8] border-t-[1.5px] border-[#1A1A1A]
      "
    >
      <div className="relative flex items-center justify-around px-2 h-16">
        <NavItem
          icon={<Home size={22} strokeWidth={1.5} />}
          label="홈"
          active={currentPage === 'home'}
          onClick={() => onNavigate('home')}
        />
        <NavItem
          icon={<Calendar size={22} strokeWidth={1.5} />}
          label="캘린더"
          active={currentPage === 'calendar'}
          onClick={() => onNavigate('calendar')}
        />

        {/* Center voice button — elevated */}
        <div className="relative -mt-8">
          <VoiceButton onInput={onVoiceInput} />
        </div>

        <NavItem
          icon={<ClipboardList size={22} strokeWidth={1.5} />}
          label="히스토리"
          active={currentPage === 'history'}
          onClick={() => onNavigate('history')}
        />
        <NavItem
          icon={<Settings size={22} strokeWidth={1.5} />}
          label="설정"
          active={currentPage === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </nav>
  );
}
