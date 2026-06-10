# ARCHI Agent Studio Development Plan

**버전:** v1.0  
**목적:** Claude Code와 사람이 함께 실제 제품을 구현하기 위한 단계별 개발 기획안

---

## 1. 개발 전략 요약

이 제품은 범위가 크므로 처음부터 모든 기능을 동시에 만들면 실패 확률이 높다. 개발 순서는 “문서 에디터 → AI 삽입 → 검색/출처 → 이미지 → 지식베이스 → 온톨로지 → 메신저” 순으로 가야 한다.

첫 번째 목표는 사용자가 웹에서 AI와 대화해 글을 생성하고, 우측 블록 에디터에 삽입한 뒤, Markdown/TXT/PDF로 다운로드하는 경험을 완성하는 것이다. 이후 이미지 생성, 지식베이스, 온톨로지, 메신저를 단계적으로 확장한다.

---

## 2. 단계별 개발 로드맵

### Phase 0. Product Foundation

목표: repo, 디자인 시스템, DB, 인증, 배포 환경의 기반 구축

핵심 작업:
- Monorepo 구성
- Next.js 웹앱 초기화
- PostgreSQL + Prisma 설정
- Auth 설정
- Workspace/Project/Document 기본 모델
- Tailwind/shadcn 기반 UI 시스템
- CI lint/test/build
- `CLAUDE.md` 및 docs 연결

완료 기준:
- 로그인 후 워크스페이스와 프로젝트를 만들 수 있다.
- 빈 문서를 만들고 저장할 수 있다.
- 개발자가 local/staging에서 동일하게 실행할 수 있다.

### Phase 1. Block Editor MVP

목표: 우측 블록형 문서 작성 경험 구현

핵심 작업:
- Document canvas layout
- Block model 정의
- heading/paragraph/image/checklist/source_reference/cta 블록
- 우측 하단 + 버튼
- 블록 추가/수정/삭제/재정렬
- autosave
- block selection state
- document version snapshot

완료 기준:
- 사용자가 블록을 직접 추가하고 수정할 수 있다.
- 블록 순서가 DB에 저장되고 새로고침 후 유지된다.
- 선택된 블록 정보를 AI panel에 전달할 수 있다.

### Phase 2. AI Chat + Document Actions

목표: 좌측 AI 채팅이 우측 문서를 실제로 수정하게 만들기

핵심 작업:
- ChatSession/ChatMessage 모델
- streaming chat UI
- current document context builder
- agent action schema
- insert_blocks, update_block, create_document tool
- AI 응답 중 action preview
- 사용자 승인 후 문서 반영

완료 기준:
- “블로그 초안 작성해줘” 입력 시 문서 블록이 자동 생성된다.
- “두 번째 문단만 전문가 톤으로 바꿔줘”가 선택 블록에만 적용된다.
- action 실패 시 복구 메시지가 나온다.

### Phase 3. Export Engine

목표: 작성된 글을 외부에서 바로 사용할 수 있게 다운로드 지원

핵심 작업:
- Markdown exporter
- TXT exporter
- PDF exporter
- export job model
- export history
- 파일 다운로드 UI

완료 기준:
- 문서가 TXT/Markdown/PDF로 정상 다운로드된다.
- 이미지 블록과 캡션이 export에 반영된다.
- 출처 블록이 문서 하단 출처 목록으로 출력된다.

### Phase 4. Search + Citation

목표: AI가 실시간 검색과 출처 기반 답변을 제공

핵심 작업:
- SearchProvider interface
- web search provider
- law API provider 초안
- KCSC source connector 초안
- Citation model
- source card UI
- legal/construction question policy
- answer with citations prompt

완료 기준:
- AI가 검색 결과를 출처 카드로 보여준다.
- 법규·공법 질문은 출처 없는 답변을 하지 않는다.
- 출처를 문서 블록에 삽입할 수 있다.

### Phase 5. Image Generation MVP

목표: 이미지 생성 후 문서 삽입

핵심 작업:
- ImageProvider interface
- text-to-image adapter
- image asset storage
- image block insert action
- prompt template for interior images
- image gallery modal

완료 기준:
- 사용자가 프롬프트로 이미지를 생성한다.
- 생성 이미지가 문서 블록으로 삽입된다.
- 이미지 생성 프롬프트와 모델 메타데이터가 저장된다.

### Phase 6. Knowledge Base MVP

목표: 내부 문서를 주입하고 AI가 출처 기반 답변 가능

핵심 작업:
- KnowledgeSource upload
- PDF/DOCX/TXT/MD text extraction
- chunking strategy
- embedding storage
- semantic retrieval
- KB query endpoint
- source approval status
- knowledge source UI

완료 기준:
- 내부 PDF를 업로드하고 검색 가능한 상태로 만들 수 있다.
- AI가 내부 문서 내용을 근거로 답변하고 출처를 표시한다.
- 승인되지 않은 지식은 기본 답변에 사용하지 않는다.

### Phase 7. Inpainting

목표: 생성/업로드 이미지의 특정 영역 수정

핵심 작업:
- image editor modal
- mask drawing UI
- inpaint adapter
- ImageVersion model
- before/after compare
- replace current image block action

완료 기준:
- 사용자가 이미지 일부를 선택해 수정 지시 가능
- 원본과 수정본이 버전으로 저장됨
- 수정본을 문서에 교체 삽입 가능

### Phase 8. Ontology Brain Map

목표: 지식베이스의 개념 관계를 시각화

핵심 작업:
- OntologyNode/OntologyEdge model
- AI ontology extraction candidate
- graph viewer
- node detail panel
- source/chunk 연결
- admin approval workflow

완료 기준:
- 방수, 타일, 배수구, 하자 등 개념이 그래프로 보인다.
- 관리자가 노드/관계를 수정하고 승인 가능하다.
- 노드를 클릭하면 관련 출처와 문서 청크가 보인다.

### Phase 9. Messenger + Task Center

목표: 웹 외부에서도 에이전트에게 업무지시

핵심 작업:
- channel/message model
- agent mention parser
- Task model
- task state machine
- task event stream
- task output linking
- review/approval UI

완료 기준:
- 메신저에서 @에이전트 업무지시 가능
- 업무 상태가 표시된다.
- 완료 산출물이 문서/이미지/답변으로 연결된다.

### Phase 10. Commercialization

목표: 유료 서비스 운영 가능 수준 확보

핵심 작업:
- billing/usage model
- quota and credits
- plan limit
- audit log UI
- organization settings
- onboarding template
- analytics dashboard
- backup and data deletion policy

완료 기준:
- 조직별 사용량과 비용이 추적된다.
- 요금제별 제한이 작동한다.
- 운영자가 품질/오류/사용량을 볼 수 있다.

---

## 3. MVP 상세 범위

### 3.1 MVP 화면

| 화면 | 필수 기능 |
|---|---|
| Login | 로그인/회원가입 |
| Dashboard | 최근 프로젝트, 새 프로젝트 |
| Project | 문서 목록, 이미지 목록, 지식 소스 목록 |
| Editor | 좌측 AI 채팅, 우측 블록 에디터, export |
| Knowledge | 파일 업로드, 처리 상태, 검색 테스트 |
| Settings | API key/provider 설정, 워크스페이스 설정 |

### 3.2 MVP에서 만들지 않는 것

- 모바일 앱
- 완전한 Slack 수준 메신저
- 고급 온톨로지 추론
- 네이버 자동 발행
- CAD/BIM 연동
- 이미지 고급 업스케일/스타일 학습

---

## 4. 개발 Epic과 Story

### Epic A. Foundation

- A1. User can sign up and log in
- A2. User can create workspace and project
- A3. User can create document
- A4. System stores audit events for core actions

### Epic B. Block Editor

- B1. User can add text block
- B2. User can add image block
- B3. User can reorder blocks
- B4. User can select block and request AI edit
- B5. User can restore previous version

### Epic C. AI Agent

- C1. User can chat with agent in editor
- C2. Agent can insert generated blocks
- C3. Agent can update selected block
- C4. Agent can ask for approval before destructive changes
- C5. Agent can show tool progress

### Epic D. Export

- D1. User can export TXT
- D2. User can export Markdown
- D3. User can export PDF
- D4. User can view export history

### Epic E. Search and Citations

- E1. Agent can search web
- E2. Agent can attach source cards
- E3. Agent can answer legal/construction questions with citations
- E4. User can insert source card into document

### Epic F. Image

- F1. User can generate image from prompt
- F2. Agent can insert generated image into document
- F3. User can upload image
- F4. User can inpaint selected area
- F5. User can compare image versions

### Epic G. Knowledge Base

- G1. User can upload PDF/DOCX/TXT/MD
- G2. System extracts text and chunks source
- G3. System retrieves chunks for a question
- G4. Agent answers with KB citations
- G5. Admin approves/archives sources

### Epic H. Ontology

- H1. System extracts candidate nodes/edges
- H2. Admin can approve nodes/edges
- H3. User can view graph
- H4. User can click node and see related sources

### Epic I. Messenger and Tasks

- I1. User can create channel
- I2. User can mention agent
- I3. Message creates task
- I4. Task status updates in realtime
- I5. Task output links to document or image

---

## 5. Claude Code 실행 규칙

Claude Code에게 작업을 줄 때는 다음 형식을 사용한다.

```text
너는 ARCHI Agent Studio의 senior full-stack engineer다.
반드시 docs/PRD.md, docs/ARCHITECTURE.md, CLAUDE.md를 먼저 읽어라.
작업 목표: [구체적 기능]
제약:
- TypeScript strict 유지
- 기존 테스트 깨지지 않게 구현
- DB migration 필요 시 Prisma migration 작성
- 사용자 데이터 삭제/덮어쓰기 금지
- 구현 전 계획을 짧게 제시하고, 구현 후 테스트 결과를 요약
완료 기준:
- [acceptance criteria]
```

---

## 6. Sprint 단위 추천 순서

1. Repo scaffold, DB, Auth, Workspace
2. Project/Document CRUD
3. Block editor 기본
4. Chat UI 기본
5. AI action schema와 insert_blocks
6. selected block update
7. Markdown/TXT/PDF export
8. Search/citation MVP
9. Image generation MVP
10. KB upload/retrieval MVP
11. Inpainting
12. Ontology graph
13. Messenger/task
14. Billing/usage/security hardening

---

## 7. Definition of Done

모든 기능은 다음 조건을 만족해야 완료로 간주한다.

1. PRD의 acceptance criteria 충족
2. TypeScript 타입 오류 없음
3. lint 통과
4. 관련 unit/integration test 통과
5. UI 변경은 screenshot 또는 Storybook으로 확인
6. DB 변경은 migration 포함
7. 보안/권한 체크 포함
8. AI 기능은 실패 케이스와 rate limit 처리 포함
9. 사용자에게 보이는 한국어 문구 점검
10. README 또는 docs 업데이트

---

## 8. 운영 준비 체크리스트

| 항목 | 체크 |
|---|---|
| 환경변수 문서화 | 필요 |
| AI provider key 관리 | 필요 |
| 이미지 생성 비용 제한 | 필요 |
| 법규 답변 disclaimer | 필요 |
| 로그/오류 모니터링 | 필요 |
| DB 백업 | 필요 |
| 파일 저장소 lifecycle | 필요 |
| 개인정보 삭제 요청 처리 | 필요 |
| 관리자 지식 승인 UI | 필요 |
| export 파일 만료 정책 | 필요 |

---

## 9. 개발팀 역할 제안

| 역할 | 책임 |
|---|---|
| Product Owner | 기능 우선순위, 도메인 검수, 사용자 시나리오 정의 |
| Tech Lead | 아키텍처, 코드 품질, provider adapter 설계 |
| Frontend Engineer | 에디터, 채팅, 그래프, 이미지 마스크 UI |
| Backend Engineer | API, DB, 권한, queue, export |
| AI Engineer | agent prompt, RAG, search, ontology extraction |
| Designer | 정보구조, 디자인 시스템, 사용성 테스트 |
| QA | E2E, export QA, RAG 평가셋, regression |
| DevOps | 배포, 모니터링, 비밀키, 백업, 보안 |

1인 또는 소수 개발 시에는 Claude Code subagent와 문서 기반 workflow로 역할을 나누어 처리한다.
