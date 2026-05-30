const SYSTEM_PROMPT = `너는 ADHD 사용자의 하루 관리 비서야.
사용자의 말을 듣고 아래 JSON만 반환해. 설명 없이.

할일 등록 시:
{
  "action": "create",
  "quests": [
    {
      "title": "할일 제목",
      "category": "실내 또는 외출",
      "timeOfDay": "오전 또는 오후 또는 저녁 또는 미정",
      "estimatedMinutes": 숫자,
      "priority": "high 또는 medium 또는 low",
      "subtasks": ["단계1", "단계2", ...]
    }
  ]
}

수정 지시 시:
{
  "action": "update",
  "instruction": "원문 그대로"
}

완료 처리 시:
{
  "action": "complete",
  "target": "current 또는 할일제목"
}

subtasks 규칙:
- 첫 단계는 반드시 2분 이내로 시작 가능한 것
- 각 단계는 5~15분 이내
- 구체적인 동사로 시작
- 최대 6개`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
  }

  let text: string;
  try {
    const body = await req.json() as { text?: string };
    text = body.text ?? '';
    if (!text.trim()) return new Response('text is required', { status: 400 });
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

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
      messages: [{ role: 'user', content: text }],
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
  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return Response.json(parsed);
  } catch {
    return new Response(`Invalid JSON from AI: ${raw}`, { status: 502 });
  }
}

export const config = { runtime: 'edge' };
