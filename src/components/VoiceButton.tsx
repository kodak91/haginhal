import { useRef, useState } from 'react';
import { Mic, Loader2, Send, X } from 'lucide-react';
import type { ISpeechRecognition } from '../lib/speech';
import { createRecognition } from '../lib/speech';

const MAX_RECORD_MS = 30_000;

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface Props {
  onInput: (text: string) => Promise<void>;
  hasQuests?: boolean;
}

export function VoiceButton({ onInput, hasQuests = false }: Props) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isLongPress = useRef(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const submitText = async (text: string): Promise<void> => {
    setVoiceState('processing');
    setModalOpen(false);
    setTextInput('');
    setElapsed(0);
    try {
      await onInput(text);
      setVoiceState('idle');
    } catch {
      setErrorMsg('다시 시도해 주세요');
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    }
  };

  const startTick = () => {
    setElapsed(0);
    tickTimer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const clearTimers = () => {
    clearTimeout(autoStopTimer.current);
    clearInterval(tickTimer.current);
    setElapsed(0);
  };

  const startListening = () => {
    const rec = createRecognition();
    if (!rec) { setModalOpen(true); return; }

    recognitionRef.current = rec;
    transcriptRef.current = '';
    setVoiceState('listening');
    startTick();

    autoStopTimer.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, MAX_RECORD_MS);

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcriptRef.current += e.results[i][0].transcript;
        }
      }
    };

    rec.onerror = () => {
      clearTimers();
      setVoiceState('idle');
    };

    rec.onend = () => {
      clearTimers();
      const t = transcriptRef.current.trim();
      if (t) void submitText(t);
      else setVoiceState('idle');
    };

    rec.start();
  };

  const stopListening = () => {
    clearTimers();
    recognitionRef.current?.stop();
  };

  const handlePressStart = () => {
    if (voiceState !== 'idle') return;
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      startListening();
    }, 250);
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer.current);
    if (voiceState === 'listening') {
      stopListening();
    } else if (!isLongPress.current && voiceState === 'idle') {
      setModalOpen(true);
    }
  };

  const icon =
    voiceState === 'processing' ? (
      <Loader2 size={26} className="animate-spin" strokeWidth={1.5} />
    ) : voiceState === 'error' ? (
      <X size={26} strokeWidth={1.5} />
    ) : (
      <Mic size={26} strokeWidth={1.5} />
    );

  const modalPlaceholder = hasQuests
    ? '예: 보고서를 오후로 옮겨줘'
    : '예: 내일까지 보고서 작성하기';

  const modalHint = hasQuests
    ? '할일 추가 또는 수정 지시를 입력하세요'
    : '할일을 입력해 주세요';

  return (
    <>
      <div className="relative flex items-center justify-center">
        {voiceState === 'listening' && (
          <>
            <span className="voice-ring absolute inset-0 rounded-full bg-[#46E08A]" />
            <span className="voice-ring-2 absolute inset-0 rounded-full bg-[#46E08A]" />
          </>
        )}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={() => { if (voiceState === 'listening') stopListening(); }}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          aria-label="할일 입력"
          className={`
            relative z-10 w-16 h-16 rounded-full border-2 border-[#1A1A1A]
            flex items-center justify-center transition-transform active:scale-95
            ${voiceState === 'listening'
              ? 'bg-[#1A1A1A] text-white'
              : voiceState === 'error'
              ? 'bg-red-50 text-red-500'
              : 'bg-[#46E08A] text-[#1A1A1A]'
            }
          `}
        >
          {icon}
        </button>
      </div>

      {voiceState === 'listening' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
          <span className="text-[13px] text-[#9A9A9A] bg-white border border-[#E0E0E0] rounded-full px-4 py-1.5">
            듣는 중 {elapsed}s / 30s — 손 떼면 완료
          </span>
        </div>
      )}

      {voiceState === 'error' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
          <span className="text-[13px] text-red-500 bg-white border border-red-200 rounded-full px-4 py-1.5">
            {errorMsg}
          </span>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="w-full max-w-lg bg-white border-t-2 border-[#1A1A1A] rounded-t-3xl p-5 pb-10">
            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5" />
            <p className="text-[13px] text-[#9A9A9A] mb-3">{modalHint}</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && textInput.trim()) void submitText(textInput.trim()); }}
                placeholder={modalPlaceholder}
                className="
                  flex-1 border-2 border-[#1A1A1A] rounded-full
                  px-4 py-2.5 text-[15px] outline-none bg-[#F2F2F2]
                  focus:border-[#46E08A] transition-colors placeholder:text-[#C0C0C0]
                "
              />
              <button
                onClick={() => { if (textInput.trim()) void submitText(textInput.trim()); }}
                disabled={!textInput.trim()}
                className="w-11 h-11 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center disabled:opacity-30"
              >
                <Send size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
