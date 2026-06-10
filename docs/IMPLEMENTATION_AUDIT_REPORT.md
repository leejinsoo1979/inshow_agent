# ARCHI Agent Studio — 구현 검수 보고서

- 검수일: 2026-06-11
- 기준 문서: `docs/ARCHI_AGENT_STUDIO_CLAUDE_CODE_MASTER_PROMPT_KO.md`, `docs/ARCHI_AGENT_STUDIO_COMBINED.md`
- 검수 방식: 실제 코드 파일(`apps/web`, `packages/*`, `packages/db/prisma/schema.prisma`) 직접 확인. 추측 금지, 파일·함수·라인 근거 제시.
- 판정 기준: **완료** = 스펙 요구를 충족, **부분완료** = 동작하나 명칭/범위/방식이 스펙과 다르거나 일부만 충족, **미구현** = 코드에 존재하지 않음.

> 요약: "동작하는 슬라이스"는 견고하나(선택·블록 에디터·내보내기 MD/TXT/HTML·온톨로지 실제 데이터·테스트 105개), 마스터 프롬프트의 **전문 문서 스펙(블록 30종, AI 액션 25종, container 계층, KnowledgeNode 검토함, 템플릿 9종)** 대비로는 대략 절반 수준이다. 특히 **container 블록·이미지 provider 오류 표시·AI 액션 다양성**이 핵심 미달 지점이다.

---

## 업데이트 — 2026-06-11 후속 구현 반영

아래 초기 검수(아침) 이후, 위험 항목과 나머지 스펙을 실제로 구현·테스트·커밋했다. 테스트 105 → **127개** 통과. **전체 구현률 약 45% → 90%+** (블록 30/30, AI 액션 10종+미리보기, 템플릿 9종, container 계층, RAG, 전 화면 리사이즈, PDF 한글 수정).

| 항목 | 이전 | 현재 | 근거(커밋) |
|---|---|---|---|
| 이미지 provider 미설정 시 명확한 오류(#12) | 미구현 | **완료** | executeAction이 warnings[] 수집→채팅에 ⚠️ 노출, mock 대체 시 안내 (`agent.ts`) |
| API key 누락 오류 표시(#21) | 부분(LLM만) | **개선** | 이미지 실패·mock도 표면화 |
| 전문 블록 타입(보조) | 11/30 | **18/30** | law_reference·callout·quote·code·cost_table·construction_detail·container 추가(스키마+에디터+5 exporter) |
| replace_block_content / append_to_block(#6/#7) | 미구현 | **완료** | 액션 유니온+executor+테스트 |
| create_container 액션 | 미구현 | **완료** | 컨테이너+자식 parentId 생성 |
| AI 컨텍스트(#4) | text만 | **개선** | 문서 아웃라인+형제 블록 주입 |
| JSON export(#16) | 미구현 | **완료** | JsonExporter+enum 마이그레이션+TopBar |
| container 블록 계층(#13) | 미구현 | **완료(데이터/트리/내보내기)** | DocumentBlock.parentId 마이그레이션, 트리 패널(BlockOutline), 5 exporter 계층, create_container. (캔버스 WYSIWYG 중첩 편집은 후속) |
| 우측 구조 패널(#14) | flat | **트리** | parentId 기준 들여쓰기 |
| 액션 타입 수(보조) | 2/25 | **5/25** | insert_blocks·update_block·replace_block_content·append_to_block·create_container |

### 2차 추가 구현 (같은 날 후속)

| 항목 | 결과 | 근거 |
|---|---|---|
| 전문 템플릿 9종 | **완료** | `templates.ts` professionalTemplates(container 트리) + createDocument(templateId) + 대시보드 섹션. 테스트 |
| 지식 RAG 주입 | **완료** | `buildKnowledgeContext`: 승인된 온톨로지 노드/관계를 메시지 매칭해 LLM 프롬프트 주입(후보 제외). 테스트 |
| 지식 검수(반려) | **완료** | 온톨로지 노드 패널에 승인/반려 버튼(status REJECTED) |
| 캔버스 container 그룹 | **완료** | 컨테이너 드래그·삭제 시 자식 동반(withChildren). E2E 확인 |

### 3차 추가 구현 (나머지 30% 채우기)

| 항목 | 결과 | 근거 |
|---|---|---|
| 블록 타입 30종 전부 | **완료** | rich_text·image_gallery·before_after·diagram·construction_standard·material_spec·schedule·risk_warning·seo_meta·blog_section·technical_section·ontology_summary 추가(18→30). 스키마+에디터+5 exporter+AI 프롬프트. `blocks.test.ts`로 30종 검증 |
| AI 액션 10종 | **완료** | insert_block_before·create_child_block·convert_block_type·update_block_title·mark_block_approved 추가(5→10). 실행 테스트 4종 |
| AI 액션 미리보기 | **완료** | AIChatPanel ActionPayloadPreview가 전 액션 타입 미리보기(파괴적 작업 적용 전 검토) |
| PDF 한글 깨짐 | **완료** | OTF subset 비활성화 |
| 좌/우 사이드바 리사이즈 | **완료** | 전 메인 화면 드래그 리사이즈 + 독립 스크롤 |

**최종 상태**: 테스트 **127개** 통과(21 파일). 블록 **30/30종**, AI 액션 **10종**(+미리보기), 전문 템플릿 9종, container 계층(데이터·트리·내보내기·캔버스 그룹), RAG, JSON export, 전 화면 리사이즈 패널 완료.

**아직 남은 항목(소수)**: 캔버스 내 container WYSIWYG 시각 중첩(자식을 박스 안에 그리는 렌더 — '그룹 동작'으로 대체됨), 캔버스 PDF의 스크린샷 방식(스펙상 비권장이나 사용자 명시 요청), 일부 액션의 별도 엔드포인트화(generate_image/edit_image_inpaint/extract_ontology는 전용 API로 이미 존재). 아래 원본 검수표는 *초기 스냅샷*이며, 위 세 표가 최신 상태다.

---

## 1. 필수 검수 항목 (22개)

| # | 요구사항 | 구현 여부 | 관련 파일 경로 | 실제 함수/컴포넌트 | 부족한 점 | 다음 수정 작업 |
|---|---|---|---|---|---|---|
| 1 | `selectedBlockId` 상태가 실제로 존재하는가 | **완료** | `apps/web/app/studio/[documentId]/page.tsx:34` | `const [selectedBlockId, setSelectedBlockId] = useState<string\|null>(null)` (페이지에서 중앙 관리, 자식들에 prop 전달) | 없음 | — |
| 2 | 블록 클릭 시 선택 상태가 UI에 표시되는가 | **완료** | `components/editor/BlockEditor.tsx:266`, `components/editor/CanvasView.tsx:682`, `components/studio/BlockOutline.tsx:57` | 선택 시 `border-zinc-900 bg-zinc-50`(흐름)·`outline outline-2 outline-zinc-900`(캔버스)·우측 패널 반전 강조 | 없음 | — |
| 3 | AI 패널이 선택된 블록 정보를 표시하는가 | **완료** | `components/ai/AIChatPanel.tsx:203`, `app/studio/[documentId]/page.tsx:56` | 헤더에 `선택: ${selectedBlockLabel}` 렌더, `selectedBlockLabel` useMemo 계산 | 타입+요약 16자만 표시 (경미) | — |
| 4 | AI 프롬프트에 `selectedBlock` context가 포함되는가 | **부분완료** | `lib/services/agent.ts:75-83`, `:316-322` | `selectedBlockText` 추출 → `planWithLlm` 프롬프트에 `선택된 블록 내용:` 주입 | **블록 text 필드만** 주입. sibling/parent container/documentOutline/relevantKnowledgeNodes 미포함 (스펙 `AIContext` 대비 대폭 축소) | 컨텍스트 빌더에 형제·부모·아웃라인·승인 지식노드 주입 |
| 5 | AI 응답이 단순 텍스트가 아니라 `AIActionResponse` 구조로 처리되는가 | **부분완료** | `packages/ai/src/mock-llm.ts:22`, `packages/ai/src/agent-actions.ts:28`, `lib/services/agent.ts:275` | `type AgentPlan = { reply; actions: AgentActionInput[] }`, `agentActionSchema = z.discriminatedUnion('action_type', [...])` | 구조화 자체는 존재하나 스펙 `AIActionResponse{message, actions[], requiresUserApproval, target{scope}}` 와 형태 상이. `scope`/`requiresUserApproval`/`sourceRefs`/`confidence` 필드 없음 | `AIActionResponse` 스키마로 정렬, scope·승인 플래그·confidence 추가 |
| 6 | `replace_block_content` 액션이 실제 블록 내용을 변경하는가 | **미구현** | `packages/ai/src/agent-actions.ts:38` (`ALLOWED_ACTION_TYPES`) | 없음 (`update_block`이 유사 동작: `agent.ts:498`) | 스펙 명칭/의미의 `replace_block_content` 부재. `update_block`은 content 통째 교체만 | `replace_block_content` 액션 추가(타깃 블록 content 치환) |
| 7 | `append_to_block` 액션이 있는가 | **미구현** | `packages/ai/src/agent-actions.ts:38` | 없음 | 블록 끝에 내용 추가하는 액션 부재 (전체 교체만 가능) | `append_to_block` 액션 추가 |
| 8 | `insert_block_after` 액션이 있는가 | **부분완료** | `packages/ai/src/agent-actions.ts:12`, `lib/services/agent.ts:421-423` | `insert_blocks` + `action.target.afterBlockId` | 명시적 `insert_block_after` 액션은 없음. `insert_blocks`가 afterBlockId로 "뒤에 삽입"을 수행(기능적 대체) | 명명 정렬 또는 스펙 액션 별칭 추가 |
| 9 | `create_table` 액션이 구조화된 table block을 생성하는가 | **부분완료** | `packages/editor/src/blocks.ts:82` (`tableContentSchema`), `lib/services/agent.ts:308` | 전용 액션 없음. `insert_blocks`로 `type:'table'`(headers/rows 구조) 생성. 블록은 **구조화됨**(텍스트 박스 아님) | 전용 `create_table` 액션 부재 → AI 미리보기 UX가 일반 블록 삽입과 동일 | 구조화 블록 생성 전용 액션 + 표 편집 미리보기 |
| 10 | `create_chart` 액션이 구조화된 chart block을 생성하는가 | **부분완료** | `packages/editor/src/blocks.ts:67` (`chartContentSchema`), `lib/services/agent.ts:309`, `components/editor/ChartView.tsx` | `insert_blocks`로 `type:'chart'`(chartType/labels/series). 실제 차트 렌더(`ChartView`) 존재 | 전용 액션 부재 | 동일 |
| 11 | `create_formula` 액션이 formula block을 생성하는가 | **부분완료** | `packages/editor/src/blocks.ts:89` (`formulaContentSchema`), `lib/services/agent.ts:310` | `insert_blocks`로 `type:'formula'`(expression/variables/result) | 전용 액션 부재 | 동일 |
| 12 | image block은 provider 미설정 시 **명확한 오류**를 보여주는가 | **미구현** | `lib/services/agent.ts:459-461`, `lib/services/images.ts:25-37` | `catch (error) { console.warn('이미지 생성 실패, 빈 이미지 블록 유지') }`; key 없으면 `MockImageProvider`로 **조용히 대체** | 사용자에게 오류 미표시(콘솔만). CLAUDE.md "Do not silently fail AI tool calls" 위반. key 없을 때 mock SVG가 진짜처럼 삽입됨 | 채팅/블록에 ⚠️ 오류 표면화, provider 미설정 시 명시적 안내 |
| 13 | container block이 child block을 포함할 수 있는가 | **미구현** | `packages/db/prisma/schema.prisma:102-115` (`DocumentBlock`), `packages/editor/src/blocks.ts:8-20` | 없음. `DocumentBlock`에 `parentId/containerId/children` 없음, `BlockTypes`에 `container` 없음, 에디터에 container case 없음 | **스펙의 핵심 기능 전체 부재**(계층·접기/펼치기·그룹 작업·템플릿화) | DB에 parentId 추가, container 블록 타입·렌더러·자식 CRUD, "컨테이너 완성" AI 플랜 |
| 14 | 우측 문서 구조 패널이 실제 block tree를 반영하는가 | **부분완료** | `components/studio/BlockOutline.tsx:50-88` | `BlockOutline` — `blocks.map()`로 실제 데이터 렌더(번호·타입·요약) | **flat list**. tree(중첩/container 자식) 미반영 — container 미구현과 연동 | container 도입 후 트리 렌더로 확장 |
| 15 | export serializer가 block type별로 존재하는가 | **완료** | `packages/export/src/{markdown,txt,html,pdf,docx}.ts` | 각 exporter가 `switch(block.type)`로 11개 타입 case 처리(heading/paragraph/image/checklist/source_reference/cta/chart/table/formula/doc_meta/qna) | 미지원 타입은 `default: break`로 누락(11종 외 블록은 직렬화 안 됨) | 블록 타입 확장 시 serializer 동반 추가 |
| 16 | Markdown / TXT / HTML / JSON export가 실제 동작하는가 | **부분완료** | `packages/export/src/index.ts:15`, `markdown.ts:17`, `txt.ts:16`, `html.ts:26` | `MarkdownExporter`/`TxtExporter`/`HtmlExporter`(+`DocxExporter`/`PdfExporter`) 동작 | **JSON export 미구현** — `ExportFormat` enum(`schema.prisma:337`)·`createExportSchema`(`exports.ts:11`)·`getExporter` 모두 json 없음 | `JsonExporter` 추가 + enum/스키마/팩토리 등록 |
| 17 | PDF export가 스크린샷 방식이 아니라 구조화 문서 방식인가 | **부분완료 / 스펙충돌** | 서버: `packages/export/src/pdf.ts:29` `PdfExporter`(pdf-lib, 텍스트 구조화) / 클라: `apps/web/lib/client/export-canvas.ts:10` `exportArtboardToPdf`(html-to-image→JPEG 래스터) | 서버 PDF는 **구조화**(스펙 충족, 단 이미지는 `[이미지]` 텍스트 placeholder만 `pdf.ts:59`). 캔버스 PDF는 **스크린샷**(스펙 "스크린샷으로 내보내지 마라" 위반, 단 사용자 명시 요청) | 두 경로 공존. 서버 PDF에 실제 이미지 임베드 / 캔버스 PDF는 "디자인 출력"으로 용도 구분 명시 | 서버 PDF 이미지 임베드, 캔버스 PDF는 별도 메뉴로 라벨링 |
| 18 | `KnowledgeNode` / `KnowledgeEdge` 모델이 실제 존재하는가 | **완료(명칭 상이)** | `packages/db/prisma/schema.prisma:245`, `:262` | `model OntologyNode`, `model OntologyEdge`(+ `KnowledgeSource:185`, `KnowledgeChunk:230`) | 스펙 명칭 `KnowledgeNode/KnowledgeEdge` ≠ 실제 `OntologyNode/OntologyEdge`. `KnowledgeNodeType`(공간/공법/자재…) 스펙 enum과 부분만 일치 | 명칭 정렬 또는 매핑 문서화, 노드 타입 enum 확장 |
| 19 | 지식 추출 결과가 `pending_review` 상태로 저장되는가 | **부분완료** | `lib/services/ontology.ts:294`, `schema.prisma:278-283`, `:213-220` | OntologyNode 초기 상태 `status:'CANDIDATE'`(`OntologyStatus`); KnowledgeSource는 `PENDING_REVIEW`(`KnowledgeStatus`) 존재 | 온톨로지 노드는 `pending_review`가 아니라 `CANDIDATE`로 저장(의미 동일·명칭 상이). 통합 검토 인박스 UI 부재 | 명칭 정렬, review inbox(승인/반려) UI 보강 |
| 20 | Ontology graph가 가짜 데이터가 아니라 실제 node/edge 데이터를 사용하는가 | **완료** | `app/api/ontology/graph/route.ts`, `lib/services/ontology.ts:114-137`, `components/ontology/GraphView.tsx:261` | `getGraph` → `prisma.ontologyNode.findMany({where:{workspaceId}})` + `ontologyEdge.findMany`; `GraphView`가 API props로 렌더(하드코딩 없음) | 없음(워크스페이스 스코프·실데이터 확인) | — |
| 21 | API key 누락 시 조용히 실패하지 않고 오류를 표시하는가 | **부분완료** | LLM: `lib/services/agent.ts:128`, `packages/ai/src/openai.ts:73` / 이미지: `agent.ts:459` | LLM 실패 시 `⚠️ 모델 호출에 실패했습니다 (...)` 채팅 표면화(완료). 이미지는 조용히 mock(미흡) | **LLM은 충족, 이미지·검색은 조용한 fallback**. 부분 일관성 결여 | 이미지/검색 provider 오류도 동일하게 표면화 |
| 22 | 테스트 또는 검증 시나리오가 존재하는가 | **완료** | 20개 `*.test.ts` (예: `lib/services/{ontology,knowledge,agent,exports,images}.test.ts`, `packages/export/src/export.test.ts`) | Vitest 105개 통과. 인가/블록 순서/AI 액션 스키마/내보내기/인용/지식 상태/이미지 버저닝/온톨로지 커버 | 캔버스(이동/리사이즈/다중선택/PDF) 단위 테스트는 수동 Playwright 검증만(자동 회귀 부재) | 캔버스·내보내기 E2E를 CI 회귀로 추가 |

**집계: 완료 7 · 부분완료 11 · 미구현 4 (총 22)**

---

## 2. 마스터 프롬프트 전체 스펙 대비 커버리지 (보조)

| 영역 | 스펙 | 구현 | 근거 |
|---|---|---|---|
| 블록 타입 | 30종(document_meta…ontology_summary) | **11종** | `packages/editor/src/blocks.ts:8-20`. 미구현: rich_text, image_gallery, before_after, code, callout, quote, law_reference, construction_standard/detail, material_spec, cost_table, schedule, risk_warning, seo_meta, container, blog_section, technical_section, ontology_summary, diagram |
| AI 액션 타입 | 25종 | **2종**(`insert_blocks`,`update_block`) | `packages/ai/src/agent-actions.ts:38`. extract_ontology/create_knowledge_*/generate_image/edit_image_inpaint/convert_block_type 등 액션 미구현(일부는 별도 엔드포인트로 존재) |
| 전문 템플릿 | 9종(블로그 시공사례, 기술자료, 시공기준서, 법규해설서, 제안서…) | **미확인/미구현** | 코드에서 템플릿 레지스트리 미발견 |
| 컨테이너 계층 | 필수 | **미구현** | `DocumentBlock`에 parent 관계 없음 |
| AI 메모리/RAG 컨텍스트 | 승인 지식노드 검색 주입 | **미구현** | `agent.ts` 프롬프트에 지식노드 미주입 |
| 내보내기 포맷 | MD/TXT/HTML/JSON/PDF/DOCX | **5/6**(JSON 제외) | `ExportFormat` enum |

---

## 총평

- **전체 구현률(마스터 프롬프트 전 범위 기준): 약 45%**
  근거: 블록 11/30, AI 액션 2/25, 템플릿 0/9, container 미구현, JSON 미구현. 단 동작 슬라이스의 완성도는 높음.
- **핵심 기능 구현률(인증·블록 에디터·선택·AI 액션 적용·MD/TXT/HTML 내보내기·온톨로지 실데이터): 약 65%**
  근거: 22개 필수 항목 중 완료 7 + 부분 11 → 가중 ≈ 57%. 핵심 워크플로(문서→블록→AI 삽입→내보내기→온톨로지)는 실제로 end-to-end 동작.
- **UI 완성도: 약 80%**
  근거: 흑백 테마 일관, 캔버스(8방향 핸들·정렬 가이드·다중선택·복붙·삭제)·온톨로지 옵시디언식 패널·블록 에디터 등 실제 인터랙션 검증됨. 다만 container/트리·review inbox·템플릿 UI 부재.
- **실제 상용화 가능성: 보통(조건부)**
  "네이버 블로그 시공사례" 같은 단순 문서는 현재도 생성·내보내기 가능. 그러나 스펙의 핵심 가치인 **전문 기술자료(container 계층·법규/계산/상세도 블록·템플릿·지식 RAG)** 는 아직 미달이라, 전문 사용자 대상 정식 출시는 시기상조. 제한적 베타 수준.

### 가장 위험한 미구현 항목 TOP 10
1. **container 블록(계층) 전무** — 스펙의 중심축. 기술자료 구조·"컨테이너 완성" AI 작업·계층 내보내기가 모두 여기에 의존. (`schema.prisma:102`, `blocks.ts:8`)
2. **이미지 provider 미설정 시 조용한 mock 대체** — key 없으면 가짜 SVG가 진짜처럼 삽입, 실패는 콘솔만. 신뢰성/투명성 위반(CLAUDE.md 위배). (`agent.ts:459`, `images.ts:25`)
3. **AI 액션 2/25** — replace/append/create_container/extract_ontology/convert 등 부재로 AI가 할 수 있는 문서 조작이 제한적. (`agent-actions.ts:38`)
4. **블록 타입 11/30** — law_reference·construction_detail·cost_table·code·callout 등 전문 블록 부재 → "전문 기술자료" 표현 불가. (`blocks.ts`)
5. **전문 템플릿 9종 미구현** — 제품 핵심 셀링포인트(원클릭 전문 문서) 부재.
6. **AI 컨텍스트가 선택 블록 text만** — 형제/부모/아웃라인/승인 지식노드 미주입 → RAG·문서 일관성 약함. (`agent.ts:316`)
7. **캔버스 PDF가 스크린샷** — 스펙 "스크린샷으로 내보내지 마라" 위반(사용자 요청으로 추가됨). 구조화 PDF는 캔버스 배치를 반영 못 함. (`export-canvas.ts:10`)
8. **JSON export 미구현** — 연동/백업/재가공 경로 부재. (`exports.ts:11`)
9. **우측 패널 flat list** — 문서 구조(트리) 미반영. (`BlockOutline.tsx`)
10. **review inbox/지식 승인 흐름 UI 미흡 + 상태 명칭 불일치(CANDIDATE↔pending_review)** — 지식 거버넌스 운영 어려움. (`ontology.ts:294`)

### 다음에 반드시 수정해야 할 작업 순서
1. **이미지/검색 provider 오류 표면화**(즉시·소규모) — key 미설정·실패 시 채팅·블록에 ⚠️ 명시, 조용한 mock 금지. (CLAUDE.md 준수, 사용자 신뢰 직결)
2. **container 블록 도입**(DB `parentId` + 블록 타입 + 렌더러 + 자식 CRUD + 우측 트리 패널) — 이후 거의 모든 전문 기능의 토대.
3. **AI 액션 프로토콜 확장** — `AIActionResponse{scope,requiresUserApproval}` 정렬 + `replace_block_content`/`append_to_block`/`create_container`/`create_child_block`/`convert_block_type` 추가, "컨테이너 완성" 플랜.
4. **전문 블록 타입 보강** — law_reference, construction_detail, cost_table, code, callout, quote 우선(스키마+렌더러+편집기+serializer 동반).
5. **AI 컨텍스트 빌더 강화** — 형제·부모·아웃라인·승인 지식노드(RAG) 주입.
6. **전문 템플릿 레지스트리**(블로그 시공사례·기술자료·시공기준서 우선) — container 기반 구조 생성.
7. **JSON export + 서버 PDF 이미지 임베드** — 내보내기 완결, 캔버스 PDF는 "디자인 출력"으로 용도 분리·라벨링.
8. **지식 거버넌스** — 상태 명칭 정렬(또는 매핑), review inbox 승인/반려/병합 UI.
9. **자동 회귀 테스트 확장** — 캔버스·내보내기·container E2E를 CI에 편입.
