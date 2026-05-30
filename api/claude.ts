const SYSTEM_PROMPT = `너는 ADHD 사용자의 하루 관리 비서야.
사용자의 말을 듣고 아래 JSON만 반환해. 설명 없이.

[할일 등록 시]
{
  "action": "create",
  "quests": [
    {
      "title": "할일 제목",
      "category": "실내 또는 외출",
      "timeOfDay": "오전 또는 오후 또는 저녁 또는 미정",
      "estimatedMinutes": 숫자,
      "priority": "high 또는 medium 또는 low",
      "subtasks": [
        { "title": "단계 제목", "estimatedMinutes": 예상분수 }
      ]
    }
  ]
}

[퀘스트 재배치/수정 시 — currentQuests 목록의 id를 사용]
시간대 변경: { "action": "rearrange", "updates": [{ "id": "퀘스트id", "timeOfDay": "오후" }] }
삭제: { "action": "delete", "targetId": "퀘스트id" }
세부미션 재구성: { "action": "resubtask", "targetId": "퀘스트id", "subtasks": [{ "title": "단계", "estimatedMinutes": 분 }] }

[완료 처리 시]
{ "action": "complete", "target": "current 또는 할일제목" }

subtasks 규칙:
- 첫 단계는 반드시 2분 이내로 시작 가능한 것 (estimatedMinutes: 2)
- 각 단계는 최대 30분 이내
- 구체적인 동사로 시작
- 최대 6개
- estimatedMinutes는 현실적으로 추정`;

type CurrentQuest = { id: string; title: string; timeOfDay: string; priority: string };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
  }

  let text: string;
  let currentQuests: CurrentQuest[] = [];

  try {
    const body = await req.json() as { text?: string; currentQuests?: CurrentQuest[] };
    text = body.text ?? '';
    currentQuests = body.currentQuests ?? [];
    if (!text.trim()) return new Response('text is required', { status: 400 });
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // Provide quest context for rearrange mode
  const userMessage =
    currentQuests.length > 0
      ? `현재 퀘스트 목록:\n${JSON.stringify(currentQuests, null, 2)}\n\n사용자 지시: ${text}`
      : text;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '');
    return new Response(`Anthropic error: ${errText}`, { status: 502 });
  }

  const data = await anthropicRes.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const raw = data.content?.[0]?.text?.trim() ?? '';
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return Response.json(parsed);
  } catch {
    return new Response(`Invalid JSON from AI: ${raw}`, { status: 502 });
  }
}

export const config = { runtime: 'edge' };
