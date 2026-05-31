# 하긴할거야진짜로 — 변경 이력

---

## Phase 2.5 — 세션 3 (2026-05-31)

### AI 비서/PM 기능 개편

#### 데이터 모델
- **quest.ts**: `location: '집'|'회사'|'학교'|'밖'|'어디서든'` 필드 추가
  - 기존 `category: 실내|외출` 는 Firestore 하위호환으로 유지 (`locationToCategory()` 파생 저장)
  - `QuestCard.tsx`: `quest.location ?? quest.category` 로 표시

#### AI 액션 확장 (api/claude.ts)
- **`update` 구현**: title·location·timeOfDay·priority 단일 수정 (기존엔 토스트만 뜨고 미구현이었음)
- **`add_subtask` 추가**: 기존 퀘스트에 세부항목 하나 추가
- `create` 액션: `category` → `location` 기반으로 변경

#### 시스템 프롬프트 개편 (api/claude.ts)
- location 개념 추가 (집/회사/학교/밖/어디서든)
- 현재 시각(오전/오후/저녁) 자동 포함 (KST)
- PM 판단 기준 추가 (이동 효율, 시간 과부하 분산)
- 마크다운 코드블록 없이 반환 명시

#### 컨텍스트 강화 (src/lib/claude.ts)
- 기존: `{ id, title, timeOfDay, priority }`
- 변경: `{ index, id, title, location, timeOfDay, priority, subtaskCount, doneCount, estimatedMinutes }`
- "첫 번째 할일", "2번 퀘스트" 등 자연어 참조 가능

#### 문서
- **HARNESS.md**: Phase 2.5 AI 설계 섹션 추가

---

## Phase 2 — 세션 2 (2026-05-31)

### 타이머 핵심 버그 수정
- **QuestTimer.tsx**: `setTimer` updater 안에서 `onSubtaskToggle` 호출하던 구조 제거
  - 이전: updater 내부 side effect → React strict mode / 비동기 타이밍 문제로 다음 목록 진행 안 됨
  - 이후: `setInterval` 콜백에서 직접 호출, `onSubtaskToggleRef` 등 callback ref 패턴 적용
  - 결과: 타이머 만료 → 완료 처리 → 다음 목록 자동 진행 → 마지막 완료 시 퀘스트 종료 정상 동작
- **QuestTimer.tsx**: `advanceTo` ref 헬퍼로 다음 목록 진행 로직 통합
- **SubtaskList.tsx**: 각 항목 우측에 `estimatedMinutes`분 흐리게 표시 (`text-[11px] text-[#C0C0C0]`)
- **SubtaskList.tsx**: `items-start` → `items-center` (불릿/체크박스 수직 정렬)

### 음성 인식 구조 단순화
- **VoiceButton.tsx**: 5초 침묵 타이머 제거 → `onend` 재시작 패턴만 유지
  - 이전: silence timer + restart → 재시작 루프 문제
  - 이후: `isListeningRef = true`인 동안 `onend` 발동 시 `rec.start()` 재시작만
  - 버튼 release → `isListeningRef = false` → 다음 `onend`에서 제출
  - 안내 문구: "손 떼면 완료"

### 텍스트 멀티입력
- **VoiceButton.tsx**: Enter → 번호 칩으로 목록에 쌓기, 각 항목 X로 삭제 가능
- **VoiceButton.tsx**: 비행기 버튼 → 전체 `1. ...\n2. ...` 형식으로 합쳐서 AI 전송

### 레이아웃 버튼 원형 유지
- **QuestCard.tsx**: footer `items-stretch` + 완료버튼 `flex-1 min-w-0` → 타이머 원형 유지, 완료버튼 반응형 수축
- **QuestTimer.tsx**: 버튼에 `shrink-0 self-stretch aspect-square`
- **VoiceButton.tsx**: input에 `min-w-0 flex-1` + 버튼 `shrink-0 w-11 h-11` + 부모 `items-center`

### UI 정리
- **QuestCard.tsx**: 태그 pill 박스 → 도트 구분 메타 텍스트 (`실내 · 미정 · 30분 · 보통`)
- **QuestCard.tsx**: 고정 하단 푸터 (완료 + 타이머 버튼), 세부목록 스크롤과 독립
- **SubtaskList.tsx**: 노래방 효과 — 타이머 진행 중 항목에 #46E08A bold 오버레이 왼→오 채움
- **Home.tsx**: 카드 영역 `pb-2`, 점 페이지네이션 `pt-3 pb-6` (마이크 버튼과 간격 확보)

### 문서
- **CHANGELOG.md**: 변경 이력 파일 생성
- **HARNESS.md**: 오류 패턴 / 지시 방식 / 금기 사항 정리

---

## Phase 2 — 세션 1 (이전)

### 인증
- **Login.tsx**: `isInAppBrowser()` 탐지 (Instagram/KakaoTalk/LINE/FBAN/wv 등) — 인앱 브라우저에서는 외부 브라우저 안내 카드 표시
- **Login.tsx**: 구글 OAuth `signInWithPopup` 우선 시도, 팝업 차단 시 `signInWithRedirect` 폴백 (Safari ITP 대응)
- **App.tsx**: `getRedirectResult(auth)` 마운트 시 호출 (리다이렉트 후 복귀 처리)

### AI 처리 (api/claude.ts + src/lib/claude.ts)
- `rearrange` / `delete` / `resubtask` / `complete` 액션 추가
- `currentQuests` 컨텍스트 전달 (id, title, timeOfDay, priority)
- 각 subtask에 `estimatedMinutes` 포함

### 타이머 (초기 구현)
- **QuestTimer.tsx**: 세부 목록별 자동 타이머 (`estimatedMinutes * 60`초)
- **QuestTimer.tsx**: `onTimerUpdate` 콜백으로 progress 전달
- **audio.ts**: `playSubtaskComplete()` (440→880Hz 0.3s), `playQuestComplete()` (C-E-G 0.8s)

### UI — 일지 (Journal.tsx)
- 좌측 완료 체크박스 (원형), 헤더 편집 모드 토글
- 편집 모드: GripVertical 드래그 + 터치 순서 변경 + 삭제 버튼
- 편집 클릭 → 바텀시트 모달 (제목/세부목록 편집)
- 완료됨 섹션 탭 → `onRestore`

### 알림
- **NotificationPermissionModal.tsx**: 첫 퀘스트 생성 후 표시 (1회)
- **fcm.ts**: `requestNotificationPermission`, `initFCM(uid)`, `scheduleQuestNotification`
- **public/firebase-messaging-sw.js**: 기본 SW

---

## Phase 1 (이전)
- 기본 퀘스트 CRUD (Firestore)
- 홈 카드 스와이프 네비게이션
- 구글 로그인
- BottomNav (홈/일지/히스토리/설정)
- History 페이지 (완료 이력)
