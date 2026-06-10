# Claude Code Execution Prompts

이 문서는 Claude Code에 그대로 붙여 넣을 수 있는 개발 지시 프롬프트 모음이다. 각 프롬프트는 작은 단위로 실행하고, 구현 후 테스트 결과를 확인한다.

---

## Prompt 0. 프로젝트 초기화

```text
너는 ARCHI Agent Studio의 senior full-stack engineer다.
먼저 PRD, ARCHITECTURE, DEVELOPMENT_PLAN, CLAUDE.md의 요구사항을 읽고 요약해라.
그 다음 monorepo 구조를 생성해라.

목표:
- Next.js + TypeScript 기반 apps/web 생성
- packages/db, packages/shared, packages/ai, packages/editor, packages/export 기본 생성
- ESLint, Prettier, TypeScript strict 설정
- 기본 README와 env example 작성

제약:
- 구현 전 계획을 제시해라.
- 불필요한 기능은 만들지 마라.
- 완료 후 실행 방법과 테스트 결과를 요약해라.
```

---

## Prompt 1. DB와 인증 기반

```text
목표: User, Organization, Membership, Workspace, Project, Document, DocumentBlock의 Prisma 모델과 기본 CRUD를 구현해라.

완료 기준:
- Prisma schema와 migration 작성
- workspace 권한 체크 helper 구현
- Project/Document CRUD API 구현
- 최소 unit/integration test 작성
- 한국어 에러 메시지 포함

반드시 DATA_MODEL.md의 모델을 참고하되 MVP에 필요한 필드부터 구현해라.
```

---

## Prompt 2. 블록 에디터 MVP

```text
목표: 우측 문서 캔버스와 블록 에디터 MVP를 구현해라.

기능:
- heading, paragraph, image, checklist, source_reference, cta 블록
- 우측 하단 + 버튼으로 블록 추가
- 블록 수정/삭제/재정렬
- autosave
- selected block state

완료 기준:
- 새로고침 후 블록 순서 유지
- 선택된 블록 id가 AI panel에 전달 가능
- 기본 empty state와 loading state 구현
```

---

## Prompt 3. 좌측 AI 채팅과 Agent Action

```text
목표: 좌측 AI 채팅 UI와 agent action schema를 구현해라.

기능:
- ChatSession/ChatMessage 모델
- streaming 스타일 UI, 실제 stream이 어려우면 mock stream부터 가능
- AgentAction zod schema
- insert_blocks action
- update_block action
- action preview와 승인 버튼

완료 기준:
- 사용자가 '블로그 초안 작성해줘' 입력 시 mock 또는 실제 LLM 응답이 blocks로 삽입됨
- 선택 블록 수정이 가능
- action 실행 전후 로그가 남음
```

---

## Prompt 4. Export Engine

```text
목표: 문서를 TXT, Markdown, PDF로 내보내는 export engine을 구현해라.

기능:
- packages/export에 exporter interface 작성
- TXT exporter
- Markdown exporter
- PDF exporter, 서버에서 HTML 렌더 후 PDF 생성
- ExportJob 모델과 다운로드 API

완료 기준:
- 블록 순서 유지
- 이미지 캡션 포함
- source_reference는 출처 목록으로 변환
- 최소 3개 export 테스트 작성
```

---

## Prompt 5. Search와 Citation

```text
목표: 검색 결과를 AI 답변과 문서에 연결하는 Search/Citation MVP를 구현해라.

기능:
- SearchProvider interface
- mock search provider 또는 실제 provider adapter
- Citation 모델
- 출처 카드 UI
- legal/construction question detection helper
- 법규/공법 질문에서 citation 없으면 확답 금지

완료 기준:
- 검색 결과가 출처 카드로 표시됨
- 출처 카드를 source_reference block으로 삽입 가능
- citation 없는 법규 답변은 '확인 불가' 또는 '출처 필요' 메시지를 반환
```

---

## Prompt 6. 이미지 생성과 문서 삽입

```text
목표: ImageProvider adapter와 이미지 생성 후 문서 삽입 기능을 구현해라.

기능:
- ImageAsset/ImageVersion 모델
- ImageProvider interface
- mock provider부터 구현 가능
- 이미지 생성 modal
- 생성 이미지 image block 삽입
- prompt/model metadata 저장

완료 기준:
- 프롬프트로 이미지 생성 요청 가능
- 결과 이미지가 문서에 삽입됨
- 원본 메타데이터가 DB에 저장됨
```

---

## Prompt 7. 지식베이스 MVP

```text
목표: 파일 업로드 기반 Knowledge Base MVP를 구현해라.

기능:
- KnowledgeSource/KnowledgeChunk 모델
- PDF/TXT/MD 업로드 처리, DOCX는 가능하면 추가
- 텍스트 추출과 chunking
- embedding adapter는 mock 가능, 인터페이스는 실제 구조로 작성
- KB query endpoint
- approved 상태만 기본 검색에 사용

완료 기준:
- 사용자가 파일을 업로드할 수 있음
- chunk 목록을 볼 수 있음
- 질문 시 관련 chunk와 citation 반환
- pending_review 상태 소스는 기본 답변에 사용되지 않음
```

---

## Prompt 8. 인페인트 MVP

```text
목표: 이미지 인페인트 UI와 versioning MVP를 구현해라.

기능:
- 이미지 편집 modal
- mask drawing canvas
- inpaint provider adapter
- 새 ImageVersion 생성
- before/after preview
- 문서 이미지 블록 교체 액션

완료 기준:
- 원본은 보존됨
- 수정본이 새 version으로 저장됨
- 사용자가 수정본을 현재 문서에 적용할 수 있음
```

---

## Prompt 9. 온톨로지 그래프

```text
목표: OntologyNode/OntologyEdge와 graph viewer MVP를 구현해라.

기능:
- node/edge CRUD
- graph API
- React graph viewer
- node detail panel
- source/chunk 연결 준비
- candidate/approved 상태

완료 기준:
- sample ontology seed가 그래프로 보임
- 노드 클릭 시 상세 정보 표시
- 관리자가 candidate를 approved로 변경 가능
```

---

## Prompt 10. 메신저와 Task Center

```text
목표: 전용 메신저의 초기 버전과 Task Center를 구현해라.

기능:
- Channel/Message 모델
- @agent mention parser
- Task/TaskEvent 모델
- 메시지에서 task 생성
- task status UI
- output link field

완료 기준:
- 메신저에서 '@콘텐츠에이전트 블로그 초안 작성' 메시지를 보내면 task가 생성됨
- task 상태를 변경할 수 있음
- 완료 task에 document link를 연결 가능
```

---

## Prompt 11. 보안/품질 강화

```text
목표: MVP 전반의 보안과 품질을 점검하고 리팩터링해라.

검토 항목:
- workspace authorization 누락
- AI action schema 우회 가능성
- prompt injection 방어
- export injection/HTML sanitize
- file upload size/type 제한
- rate limit
- audit log 누락
- 테스트 부족 영역

완료 기준:
- 발견한 리스크 목록 작성
- high risk는 즉시 수정
- 나머지는 backlog issue로 정리
```
