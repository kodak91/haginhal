# 하긴할거야진짜로 — 변경 이력

---

## Phase 2 (2026-05)

### 인증
- **Login.tsx**: `isInAppBrowser()` 탐지 (Instagram/KakaoTalk/LINE/FBAN/wv 등) — 인앱 브라우저에서는 외부 브라우저 안내 카드 표시
- **Login.tsx**: 구글 OAuth `signInWithPopup` 우선 시도, 팝업 차단 시 `signInWithRedirect` 폴백 (Safari ITP 대응)
- **App.tsx**: `getRedirectResult(auth)` 마운트 시 호출 (리다이렉트 후 복귀 처리)

### 음성 입력
- **VoiceButton.tsx**: 5초 침묵 자동 종료 (`silenceTimer` + `isListeningRef`) — `onend` 발동 시 아직 듣는 중이면 자동 재시작
- **VoiceButton.tsx**: 텍스트 모달 멀티입력 — Enter로 항목 쌓기 → 비행기 버튼으로 전체 전송 (`1. ...\n2. ...` 형식)
- **VoiceButton.tsx**: `hasQuests` prop — 할일 있을 때 플레이스홀더 변경 ("옮겨줘/지워줘" 안내)
- **speech.ts**: `continuous: true`, `lang: ko-KR`

### AI 처리 (api/claude.ts + src/lib/claude.ts)
- `rearrange` / `delete` / `resubtask` / `complete` 액션 추가
- `currentQuests` 컨텍스트 전달 (id, title, timeOfDay, priority)
- 각 subtask에 `estimatedMinutes` 포함

### 타이머
- **QuestTimer.tsx**: 세부 목록별 자동 타이머 — `estimatedMinutes * 60`초 카운트다운
- **QuestTimer.tsx**: 타이머 만료 시 `expiredIdRef` 패턴으로 `onSubtaskToggle` 호출 (React updater 외부 side effect)
- **QuestTimer.tsx**: 순차 진행 — 완료 후 다음 미완료 목록으로 자동 이동, 전체 완료 시 `onQuestComplete`
- **QuestTimer.tsx**: `onTimerUpdate` 콜백으로 부모(QuestCard)에 progress 전달
- **audio.ts**: `playSubtaskComplete()` (440→880Hz 0.3s), `playQuestComplete()` (C-E-G 0.8s)

### UI — 홈 카드 (QuestCard / SubtaskList)
- **QuestCard.tsx**: 태그 박스 제거 → 도트 구분 메타 텍스트 (`실내 · 미정 · 30분 · 보통`)
- **QuestCard.tsx**: 고정 하단 푸터 — `완료(flex-1)` + `타이머 버튼(aspect-square)`, 스크롤과 독립
- **SubtaskList.tsx**: 노래방 효과 — 타이머 중인 항목 기본 텍스트(#C0C0C0)에 #46E08A bold 오버레이가 왼→오 채움
- **SubtaskList.tsx**: 각 항목 우측에 `estimatedMinutes`분 흐리게 표시

### UI — 일지 (Journal.tsx)
- 좌측 완료 체크박스 (원형, 클릭 → 완료 처리)
- 헤더 우측 `편집` 버튼 → 편집 모드 토글
- 편집 모드: GripVertical 드래그 핸들 + 터치 드래그 순서 변경 + Trash2 삭제 버튼
- 편집 모드 항목 클릭 → 바텀시트 모달 (제목/세부목록 편집, 항목 추가/삭제)
- 완료됨 섹션 — 클릭 시 `onRestore` (done: false, completedAt: deleteField())
- 메타 정보 우측 도트 구분 텍스트 (`급함 · 2/3 · 30분`)

### 알림
- **NotificationPermissionModal.tsx**: 첫 퀘스트 생성 후 600ms 뒤 표시 (1회)
- **fcm.ts**: `requestNotificationPermission`, `initFCM(uid)`, `scheduleQuestNotification`
- **public/firebase-messaging-sw.js**: 기본 SW (push 핸들러)

### 버튼 원형 수정
- QuestTimer: `shrink-0 self-stretch aspect-square`
- QuestCard footer: `items-stretch`
- VoiceButton Send 버튼: `shrink-0 w-11 h-11`

---

## Phase 1 (이전)
- 기본 퀘스트 CRUD (Firestore)
- 홈 카드 스와이프 네비게이션
- 구글 로그인
- BottomNav (홈/일지/히스토리/설정)
- History 페이지 (완료 이력)
