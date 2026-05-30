export interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      readonly [index: number]: { readonly transcript: string };
    };
  };
}

export interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export function createRecognition(): ISpeechRecognition | null {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'ko-KR';
  rec.continuous = true;   // 안드로이드 짧은 타임아웃 방지
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  return rec;
}

export function isSpeechSupported(): boolean {
  return !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}
