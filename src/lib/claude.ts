import type { AIResponse, Quest } from '../types/quest';

export async function processVoiceInput(
  text: string,
  currentQuests: Quest[] = []
): Promise<AIResponse> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      currentQuests: currentQuests.map((q) => ({
        id: q.id,
        title: q.title,
        timeOfDay: q.timeOfDay,
        priority: q.priority,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI 처리 실패: ${err}`);
  }

  return response.json() as Promise<AIResponse>;
}
