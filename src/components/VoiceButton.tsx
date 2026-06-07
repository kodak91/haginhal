import { useRef, useState } from 'react';
import { Mic, Loader2, Send, X } from 'lucide-react';
import type { RecordingHandle } from '../lib/speech';
import { startRecording, transcribeAudio, isRecordingSupported } from '../lib/speech';

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
  const [lines, setLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isLongPress = useRef(false);
  const isListeningRef = useRef(false);
  const recordingRef = useRef<RecordingHandle | null>(null);

  const clearAllTimers = () => {
    clearTimeout(autoStopTimer.current);
    clearInterval(tickTimer.current);
    setElapsed(0);
  };

  const submitText = async (text: string): Promise<void> => {
    setVoiceState('processing');
    setModalOpen(false);
    setTextInput('');
    setLines([]);
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

  const startListening = async () => {
    if (!isRecordingSupported()) { setModalOpen(true); return; }

    try {
      const handle = await startRecording();
      recordingRef.current = handle;
      isListeningRef.current = true;
      setVoiceState('listening');
      startTick();

      autoStopTimer.current = setTimeout(() => {
        if (isListeningRef.current) stopListening();
      }, MAX_RECORD_MS);
    } catch {
      // 마이크 권한 거부 또는 장치 없음
      setModalOpen(true);
    }
  };

  const stopListening = () => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    clearAllTimers();

    const handle = recordingRef.current;
    recordingRef.current = null;

    if (!handle) { setVoiceState('idle'); return; }

    setVoiceState('processing');

    void (async () => {
      try {
        const blob = await handle.stop();
        const transcript = await transcribeAudio(blob);
        if (transcript.trim()) {
          await submitText(transcript);
        } else {
          setVoiceState('idle');
        }
      } catch {
        setErrorMsg('음성 변환에 실패했어요');
        setVoiceState('error');
        setTimeout(() => setVoiceState('idle'), 2000);
      }
    })();
  };

  const handlePressStart = () => {
    if (voiceState !== 'idle') return;
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      void startListening();
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

  const closeModal = () => {
    setModalOpen(false);
    setTextInput('');
    setLines([]);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput.trim()) {
      e.preventDefault();
      setLines((prev) => [...prev, textInput.trim()]);
      setTextInput('');
    }
  };

  const handleTextSend = () => {
    const all = [...lines, textInput.trim()].filter(Boolean);
    if (all.length === 0) return;
    const combined = all.length === 1
      ? all[0]
      : all.map((l, i) => `${i + 1}. ${l}`).join('\n');
    void submitText(combined);
  };

  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, j) => j !== i));
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
            듣는 중 {elapsed}s — 손 떼면 완료
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
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-lg bg-white border-t-2 border-[#1A1A1A] rounded-t-3xl pb-10">
            {/* Handle + hint */}
            <div className="px-5 pt-5 pb-0">
              <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5" />
              <p className="text-[13px] text-[#9A9A9A] mb-3">
                {lines.length > 0 ? `${lines.length}개 입력됨 — 비행기 버튼으로 전송` : modalHint}
              </p>
            </div>

            {/* Stacked lines */}
            {lines.length > 0 && (
              <ul className="px-5 pb-3 flex flex-col gap-2">
                {lines.map((line, i) => (
                  <li key={i} className="flex items-center gap-2 bg-[#F9F9F9] rounded-xl px-3 py-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#E0E0E0] flex items-center justify-center text-[10px] font-semibold text-[#9A9A9A]">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[14px] text-[#1A1A1A]">{line}</span>
                    <button
                      onClick={() => removeLine(i)}
                      className="shrink-0 text-[#C0C0C0] active:text-red-400 transition-colors"
                      aria-label="삭제"
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Input row */}
            <div className="px-5 pt-1 flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder={lines.length > 0 ? '더 추가하려면 입력 후 엔터' : modalPlaceholder}
                className="
                  flex-1 min-w-0 border-2 border-[#1A1A1A] rounded-full
                  px-4 py-2.5 text-[15px] outline-none bg-[#F2F2F2]
                  focus:border-[#46E08A] transition-colors placeholder:text-[#C0C0C0]
                "
              />
              <button
                onClick={handleTextSend}
                disabled={!textInput.trim() && lines.length === 0}
                className="shrink-0 w-11 h-11 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
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
