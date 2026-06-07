export interface RecordingHandle {
  stop: () => Promise<Blob>;
}

function getBestMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export async function startRecording(): Promise<RecordingHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getBestMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(250); // 250ms 단위로 데이터 수집

  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
  };
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');

  const res = await fetch('/api/transcribe', { method: 'POST', body: form });
  if (!res.ok) throw new Error('음성 변환 실패');

  const data = await res.json() as { transcript: string };
  return data.transcript;
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}
