# 하긴할거야진짜로 — 작업 하네스

다음 세션을 위한 가이드. 오류 패턴, 지시 방식, 금기 사항을 정리.

---

## 1. 오류 패턴 & 해결 방식

### React: setState updater 안에서 side effect 호출 금지
**현상**: 타이머 만료 시 다음 목록으로 자동 진행이 안 됨  
**원인**: `setTimer((prev) => { onSubtaskToggle(...); })` — updater 안에서 async 함수 호출  
**최종 해결**: `setInterval` 콜백에서 직접 호출 + callback ref 패턴으로 stale closure 방지  
```ts
// Wrong
setTimer(prev => { onSubtaskToggle(prev.currentId); return ...; });

// Right — interval 콜백에서 직접 호출, ref로 최신 함수 참조
const onSubtaskToggleRef = useRef(onSubtaskToggle);
onSubtaskToggleRef.current = onSubtaskToggle; // 매 렌더마다 갱신

setInterval(() => {
  const t = timerRef.current;
  if (t.remainingSeconds > 1) { setTimer(prev => ({ ...prev, remainingSeconds: prev.remainingSeconds - 1 })); return; }
  // 만료
  setTimer(prev => ({ ...prev, isRunning: false, remainingSeconds: 0 }));
  onSubtaskToggleRef.current(t.currentId); // updater 밖에서 안전하게 호출
}, 1000);
```

### TypeScript: Props 완전 일치 필수
**현상**: Vercel 빌드 에러 (`Property 'onTimerUpdate' does not exist`)  
**원인**: `QuestTimer`에 새 prop을 추가했으나 커밋 누락 — 로컬 파일과 git 차이  
**해결**: 항상 커밋 전 `git status`로 모든 수정 파일 확인. `git add` 시 관련 파일 전부 포함  

### Firebase Auth: 인앱 브라우저 + Safari ITP
**현상 1**: Android 인앱 브라우저에서 403 `disallowed_useragent`  
**해결**: UA 탐지 후 안내 화면 표시, 정식 브라우저에서 열도록 유도  
**현상 2**: Safari에서 `signInWithRedirect` 후 auth state 소실 (ITP 쿠키 차단)  
**해결**: `signInWithPopup` 우선 시도 → 팝업 차단 에러 코드(`auth/popup-blocked` 등)일 때만 `signInWithRedirect` 폴백  

### 음성 인식: `onend` 즉시 발동 (mobile)
**현상**: 짧은 정적에도 `onend` 발동 → 분석 시작  
**원인**: 브라우저(특히 Android Chrome)가 `continuous: true`여도 내부적으로 recognition을 종료  
**올바른 구조** (hold-to-speak 모델 기준):
```
startListening() → isListeningRef = true → rec.start()
rec.onend: isListeningRef === true이면 rec.start() 재시작 (제출 X)
stopListening() → isListeningRef = false → rec.stop()
  → onend 발동 → isListeningRef === false → 제출
```
**침묵 자동 종료가 필요한 경우**: silence timer를 `onresult`마다 리셋하되, 타이머 발동 시 `isListeningRef = false` 후 `rec.stop()`. 단, rapid restart 루프가 생길 수 있으므로 UX 검증 필요.

### Flex 버튼 원형 유지
**현상**: `aspect-square` 버튼의 가로폭이 좁아져 타원 형태 / 화면 밖으로 삐져나감  
**원인**: flex 컨테이너에서 `shrink` 적용, 또는 인접 요소가 최소 너비 유지  
**해결**:
- 원형 버튼: `shrink-0` + `w-N h-N` 명시 (또는 `self-stretch aspect-square`)
- 인접 flex-1 요소: `min-w-0` 추가 → 내용 크기 이하로 수축 허용
- 부모: `items-stretch` (타이머처럼 높이 맞춰야 할 때) 또는 `items-center` (고정 크기 버튼일 때)

```tsx
// 모달 input 행 예시
<div className="flex items-center gap-2">
  <input className="flex-1 min-w-0 ..." />          {/* min-w-0 필수 */}
  <button className="shrink-0 w-11 h-11 rounded-full ..." />
</div>

// 카드 footer 예시
<div className="flex items-stretch gap-3">
  <button className="flex-1 min-w-0 py-3.5 rounded-full ...">완료</button>
  <button className="shrink-0 self-stretch aspect-square rounded-full ...">▶</button>
</div>
```

---

## 2. 사용자 지시 패턴

### 지시 방식
- **여러 요구를 한 메시지에**: "A 해주고, B 해주고, C도" 형식. 모두 하나의 작업으로 처리
- **현재 동작을 묘사 후 원하는 동작 설명**: "지금은 X인데, Y처럼 됐으면 좋겠어"
- **UI 위치를 구체적으로**: "오른쪽에", "카드 하단에 고정", "위로 펼쳐지게"
- **기능이 없어도 구조 먼저**: "나중에 X 넣을 건데, 지금은 Y만"
- **직접 테스트 후 보고**: iPhone/Android 실기기에서 테스트하고 증상 보고
- **수정 전 구조 파악 요청**: "뭘 수정하지 말고 그냥 구조를 보고싶어"

### 언어 규칙
- UI 텍스트: 한국어
- 코드/변수명: 영어
- 커밋 메시지: 영어 타입 + 한국어 설명 (예: `fix(timer): 타이머 자동 진행 수정`)
- 대화: 한국어

### 확인이 필요한 상황
- 기존 동작하는 기능을 건드려야 할 때 → 현재 구조 설명 후 방향 물어볼 것
- 오디오/알림처럼 "나중에 추가" 예정 항목 → 현재 없는 파일 수정 X

---

## 3. 하면 안 되는 일 (금기 사항)

### 코드
| 금지 | 이유 |
|------|------|
| `"use client"` 디렉티브 추가 | Vite + React 앱임. Next.js 아님. PostToolUse 훅이 잘못 제안함 — 무시할 것 |
| `hover:` 가상 클래스 사용 | 모바일 전용 앱. `active:` 사용 |
| setState updater 안에서 async 함수 호출 | React 렌더링 사이클 위반, 예측 불가 동작 |
| `any` 타입 | TypeScript strict 모드 위반 |
| 빌드 전 git push | 반드시 `npm run build` 성공 확인 후 push |
| 관련 파일 일부만 커밋 | Props 변경 시 사용처 파일 모두 함께 커밋 |

### 구조
| 금지 | 이유 |
|------|------|
| audio.ts의 효과음 교체/삭제 | 실파일(.mp3 등) 연동 예정. 현재 Web Audio API 합성음 임시 사용 |
| Firestore 스키마 무단 변경 | 기존 데이터와 하위호환성 유지 필요 |
| public/firebase-messaging-sw.js를 Firebase SDK로 교체 | Phase 3에서 별도 처리 예정 |
| `setDoc` 없이 `updateDoc` 사용 | 문서가 없으면 updateDoc 실패. users/{uid} 등 루트 문서는 setDoc merge 사용 |

### UI
| 금지 | 이유 |
|------|------|
| 태그 박스/pill 컴포넌트 재도입 | 도트 구분 텍스트로 교체됨 (공간 효율) |
| `items-center` 부모에서 `aspect-square` 자식 | 원형 깨짐. `items-stretch` 또는 명시 크기 사용 |
| SubtaskList의 노래방 overlay에 `text-wrap` | `whitespace-nowrap`으로 클리핑 정확도 유지 |

---

## 4. 스택 & 환경

```
Frontend   : React 19, Vite 8, TypeScript 6 (verbatimModuleSyntax)
Styling    : Tailwind CSS v4 (@theme 토큰, 설정 파일 없음)
Backend    : Firebase v12 (Firestore, Auth)
AI         : Anthropic claude-haiku-4-5-20251001 via Vercel Edge Function (api/claude.ts)
Push       : Firebase Cloud Messaging (FCM), VAPID key
Deploy     : Vercel (GitHub 자동 배포, master 브랜치)
PWA        : public/firebase-messaging-sw.js
```

## 5. 파일 구조 (핵심)

```
src/
  App.tsx              — 루트, Firebase 리스너, 모든 핸들러
  pages/
    Home.tsx           — 퀘스트 카드 스와이프
    Journal.tsx        — 일지 (진행 중 + 완료됨)
    History.tsx        — 완료 이력
  components/
    QuestCard.tsx      — 카드 UI + timerInfo 상태 관리
    SubtaskList.tsx    — 세부 목록 + 노래방 효과
    QuestTimer.tsx     — 타이머 로직 (expiredIdRef 패턴)
    VoiceButton.tsx    — 음성/텍스트 입력 모달
    BottomNav.tsx      — 하단 네비게이션
  lib/
    firebase.ts        — Firebase 초기화
    claude.ts          — AI 호출 (클라이언트)
    fcm.ts             — FCM 초기화 + 로컬 알림
    audio.ts           — Web Audio 효과음
    speech.ts          — SpeechRecognition 팩토리
  types/
    quest.ts           — Quest, Subtask, AIResponse 타입
api/
  claude.ts            — Vercel Edge Function (Anthropic 호출)
public/
  firebase-messaging-sw.js
```
