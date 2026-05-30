type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

function createCtx(): AudioContext | null {
  try {
    const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    return Ctx ? new Ctx() : null;
  } catch {
    return null;
  }
}

// 단계 완료음: 440Hz → 880Hz 상승, 0.3초
export function playSubtaskComplete(): void {
  const ctx = createCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  osc.onended = () => void ctx.close();
}

// 퀘스트 완료음: 도-미-솔 (C4-E4-G4), 0.8초
export function playQuestComplete(): void {
  const ctx = createCtx();
  if (!ctx) return;
  const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.22;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.35);
  });
  setTimeout(() => void ctx.close(), 1200);
}
