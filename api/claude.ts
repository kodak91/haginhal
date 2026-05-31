const SYSTEM_PROMPT = `너는 ADHD 사용자의 하루 관리 비서 겸 PM이야.
사용자의 말을 듣고 아래 JSON만 반환해. 설명 없이. 마크다운 코드블록 없이.

■ 값 종류
location : "집" | "회사" | "학교" | "밖" | "어디서든"
timeOfDay: "오전" | "오후" | "저녁" | "미정"
priority : "high" | "medium" | "low"

■ 퀘스트 목록 참조
currentQuests의 index로 참조 가능. "첫 번째 할일", "2번", "마지막 것" 등 자연어 표현 인식.

■ 액션 목록

[할일 등록]
{"action":"create","quests":[{"title":"...","location":"...","timeOfDay":"...","estimatedMinutes":숫자,"priority":"...","subtasks":[{"title":"...","estimatedMinutes":숫자}]}]}

[단일 퀘스트 수정 — 바꿀 필드만 포함]
{"action":"update","targetId":"id","changes":{"title":"...","location":"...","timeOfDay":"...","priority":"..."}}

[여러 퀘스트 순서·시간대 일괄 변경]
{"action":"rearrange","updates":[{"id":"...","timeOfDay":"...","order":숫자}]}

[세부목록 전체 교체]
{"action":"resubtask","targetId":"id","subtasks":[{"title":"...","estimatedMinutes":숫자}]}

[세부항목 하나 추가]
{"action":"add_subtask","targetId":"id","subtask":{"title":"...","estimatedMinutes":숫자}}

[삭제]
{"action":"delete","targetId":"id"}

[완료]
{"action":"complete","target":"current"}

■ subtasks 규칙
- 첫 단계는 2분 이내로 시작 가능한 것 (estimatedMinutes: 2)
- 각 단계 최대 30분 이내
- 구체적인 동사로 시작
- 최대 6개

■ PM 판단 기준
- 같은 location의 할일은 묶어서 처리 추천
- 한 시간대 총 estimatedMinutes 합이 과부하면 다른 시간대로 분산 제안
- "나가는 길에", "집에 오면서", "출근하자마자" 같은 표현으로 location·timeOfDay 파악`;

type CurrentQuest = {
  index: number;
  id: string;
  title: string;
  location: string;
  timeOfDay: string;
  priority: string;
  subtaskCount: number;
  doneCount: number;
  estimatedMinutes: number;
};

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

  // Current time context (KST = UTC+9)
  const nowUtc = Date.now();
  const kstHour = new Date(nowUtc + 9 * 3600 * 1000).getUTCHours();
  const timeCtx = kstHour < 12 ? '오전' : kstHour < 18 ? '오후' : '저녁';

  const userMessage =
    currentQuests.length > 0
      ? `현재 시각: ${timeCtx}\n현재 퀘스트 목록:\n${JSON.stringify(currentQuests, null, 2)}\n\n사용자 지시: ${text}`
      : `현재 시각: ${timeCtx}\n\n${text}`;

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
