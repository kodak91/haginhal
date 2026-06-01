import type { AIResponse, Quest, QuestSettings } from '../types/quest';

export async function processVoiceInput(
  text: string,
  currentQuests: Quest[] = [],
  questSettings?: QuestSettings
): Promise<AIResponse> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      questSettings: questSettings ?? null,
      currentQuests: currentQuests.map((q, i) => ({
        index: i + 1,
        id: q.id,
        title: q.title,
        location: q.location ?? (q.category === '외출' ? '밖' : '집'),
        timeOfDay: q.timeOfDay,
        priority: q.priority,
        subtaskCount: q.subtasks.length,
        doneCount: q.subtasks.filter((s) => s.done).length,
        estimatedMinutes: q.estimatedMinutes,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI 처리 실패: ${err}`);
  }

  return response.json() as Promise<AIResponse>;
}
