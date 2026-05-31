// Pre-load audio files to minimise latency and improve autoplay chances
const cache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  if (!cache.has(src)) {
    const el = new Audio(src);
    el.preload = 'auto';
    cache.set(src, el);
  }
  return cache.get(src)!;
}

function playFile(src: string): void {
  try {
    const audio = getAudio(src);
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked — create fresh element (some browsers unblock on second try)
      const fresh = new Audio(src);
      fresh.play().catch(() => {});
    });
  } catch {
    // ignore
  }
}

// 세부 목록 완료음
export function playSubtaskComplete(): void {
  playFile('/list_ok_sound.wav');
}

// 퀘스트 전체 완료음
export function playQuestComplete(): void {
  playFile('/app_alarm.wav');
}
