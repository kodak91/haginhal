/* ── Types ──────────────────────────────────────────────────────── */

type CurrentStatus = '' | '직장인' | '프리랜서' | '학생' | '쉬는 중' | '교대근무';

interface QuestSettings {
  itemsToCarry?: string;
  prepTime?: string;
  outingRoutine?: string;
  morningRoutine?: string;
  eveningRoutine?: string;
  currentStatus?: CurrentStatus;
}

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

/* ── Base system prompt ─────────────────────────────────────────── */

const BASE_PROMPT = `너는 ADHD 사용자의 하루 관리 비서 겸 PM이야.
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
- "나가는 길에", "집에 오면서", "출근하자마자" 같은 표현으로 location·timeOfDay 파악
- 사용자가 말한 시각은 도착 시각이 아니라 출발 시각. 이동시간 계산 없이 말한 시각 그대로 사용`;

/* ── Dynamic prompt builder ─────────────────────────────────────── */

const STATUS_HINTS: Partial<Record<CurrentStatus, string>> = {
  '직장인':   '평일 근무 시간(오전 9시~오후 6시) 고려하여 업무 외 할일은 출퇴근·점심·저녁에 배치',
  '프리랜서': '시간 제약 없음. 오전·오후·저녁에 균형 있게 분배',
  '학생':     '등하교 시간 고려. 학교 수업 시간에는 개인 할일 배치 자제',
  '쉬는 중':  '시간 제약 없음. 오전·오후·저녁에 자유롭게 배치',
  '교대근무': '시간대가 불규칙하므로 미정으로 설정하거나 사용자가 명시한 시각 우선',
};

function buildSystemPrompt(settings: QuestSettings | null): string {
  if (!settings) return BASE_PROMPT;

  const contextLines: string[] = [];

  const statusHint = settings.currentStatus ? STATUS_HINTS[settings.currentStatus] : undefined;
  if (statusHint) contextLines.push(`현재 상태: ${settings.currentStatus} — ${statusHint}`);
  if (settings.itemsToCarry)  contextLines.push(`외출 시 챙길 것: ${settings.itemsToCarry}`);
  if (settings.prepTime)      contextLines.push(`외출 준비시간: ${settings.prepTime}`);
  if (settings.outingRoutine) contextLines.push(`외출 준비 루틴: ${settings.outingRoutine}`);
  if (settings.morningRoutine) contextLines.push(`아침 루틴: ${settings.morningRoutine}`);
  if (settings.eveningRoutine) contextLines.push(`저녁 루틴: ${settings.eveningRoutine}`);

  const contextSection = contextLines.length > 0
    ? `\n\n■ 사용자 개인 설정\n${contextLines.join('\n')}`
    : '';

  // Auto-generation rules — only for settings that exist
  const rules: string[] = [];

  const hasOutingData = settings.itemsToCarry || settings.prepTime || settings.outingRoutine;
  if (hasOutingData) {
    rules.push(
      `[외출 준비 퀘스트 자동 생성]
신호: "00 가기" / "나갈 준비" / "00 출발" / "나가서 00" 등 외출 감지
조건: 메시지에 "첫 외출: 예"로 표시된 경우에만 생성
동작: 외출 퀘스트와 함께 "외출 준비" 퀘스트를 quests 배열 맨 앞에 추가해서 create
  · estimatedMinutes = 외출 준비시간에서 숫자만 추출 (없으면 30)
  · timeOfDay = 외출 퀘스트와 동일하거나 앞 시간대
  · subtasks = 챙길 것 각 항목 + 외출 준비 루틴 각 항목을 개별 subtask로 분해
"첫 외출: 아니오" → 외출 준비 퀘스트 절대 생성하지 않음`
    );
  }

  if (settings.morningRoutine) {
    rules.push(
      `[아침 루틴 자동 생성]
신호: "일어났어" / "굿모닝" / "기상" / "좋은 아침" / "모닝루틴"
동작: 아침 루틴 각 항목을 subtasks로 포함한 "아침 루틴" 퀘스트를 오전 시간대로 create`
    );
  }

  if (settings.eveningRoutine) {
    rules.push(
      `[저녁 루틴 자동 생성]
신호: "잘 준비" / "굿나잇" / "자기 전" / "잘게" / "나이트루틴"
동작: 저녁 루틴 각 항목을 subtasks로 포함한 "저녁 루틴" 퀘스트를 저녁 시간대로 create`
    );
  }

  const rulesSection = rules.length > 0
    ? `\n\n■ 자동 생성 규칙\n${rules.join('\n\n')}`
    : '';

  return BASE_PROMPT + contextSection + rulesSection;
}

/* ── Handler ────────────────────────────────────────────────────── */

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
  let questSettings: QuestSettings | null = null;

  try {
    const body = await req.json() as {
      text?: string;
      currentQuests?: CurrentQuest[];
      questSettings?: QuestSettings | null;
    };
    text = body.text ?? '';
    currentQuests = body.currentQuests ?? [];
    questSettings = body.questSettings ?? null;
    if (!text.trim()) return new Response('text is required', { status: 400 });
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // Current time context (KST = UTC+9)
  const kstHour = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
  const timeCtx = kstHour < 12 ? '오전' : kstHour < 18 ? '오후' : '저녁';

  // First-outing flag: check if any current quest is outdoors
  const OUTDOOR = ['밖', '회사', '학교'];
  const hasOutdoorQuest = currentQuests.some((q) => OUTDOOR.includes(q.location));
  const firstOutingFlag = questSettings && (questSettings.itemsToCarry || questSettings.outingRoutine)
    ? `\n첫 외출: ${hasOutdoorQuest ? '아니오' : '예'}`
    : '';

  const questList = currentQuests.length > 0
    ? `\n현재 퀘스트 목록:\n${JSON.stringify(currentQuests, null, 2)}`
    : '';

  const userMessage = `현재 시각: ${timeCtx}${firstOutingFlag}${questList}\n\n사용자 지시: ${text}`;

  const systemPrompt = buildSystemPrompt(questSettings);

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
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
