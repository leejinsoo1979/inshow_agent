# ARCHI Agent Studio API Spec

**버전:** v1.0  
**형식:** REST 우선, streaming은 SSE/WebSocket 사용 가능

---

## 1. 공통 규칙

- 모든 API는 인증 필요, 공개 공유 링크 API는 예외.
- 모든 요청은 workspace 권한을 검증한다.
- 모든 mutation은 AuditLog 대상이다.
- 실패 응답은 `{ code, message, details }` 구조를 따른다.
- AI action은 서버에서 zod schema 검증 후 실행한다.

---

## 2. Document API

### POST /api/documents

문서 생성.

Request:
```json
{
  "projectId": "project_123",
  "title": "34평 아파트 거실 리모델링",
  "type": "blog_post"
}
```

Response:
```json
{
  "id": "doc_123",
  "title": "34평 아파트 거실 리모델링",
  "blocks": []
}
```

### GET /api/documents/:id

문서와 블록 조회.

### PATCH /api/documents/:id

문서 메타 수정.

### POST /api/documents/:id/blocks

블록 추가.

Request:
```json
{
  "afterBlockId": "block_123",
  "block": {
    "type": "paragraph",
    "content": { "text": "이번 프로젝트는..." }
  }
}
```

### PATCH /api/blocks/:id

블록 내용 수정.

### POST /api/documents/:id/reorder-blocks

블록 순서 수정.

---

## 3. AI Chat API

### POST /api/ai/chat

streaming 가능. 현재 문서 컨텍스트, 선택 블록, 메시지를 전달한다.

Request:
```json
{
  "chatSessionId": "chat_123",
  "documentId": "doc_123",
  "selectedBlockIds": ["block_1"],
  "message": "두 번째 문단을 전문가 톤으로 바꿔줘",
  "mode": "editor"
}
```

Response event examples:
```json
{ "type": "message_delta", "text": "수정안을 만들고 있습니다..." }
```

```json
{
  "type": "action_preview",
  "action": {
    "action_type": "update_block",
    "target_block_id": "block_1",
    "content": { "text": "전문가 톤 수정본..." }
  }
}
```

### POST /api/ai/actions/:id/approve

AI action 승인 및 실행.

### POST /api/ai/actions/:id/reject

AI action 거절.

---

## 4. Search API

### POST /api/search

Request:
```json
{
  "query": "상가 방화문 교체 인테리어 법규",
  "sourceTypes": ["official_law", "kcsc", "web", "knowledge_base"],
  "workspaceId": "ws_123"
}
```

Response:
```json
{
  "results": [
    {
      "id": "src_result_1",
      "title": "건축법 ...",
      "sourceType": "official_law",
      "publisher": "법제처",
      "url": "...",
      "snippet": "...",
      "retrievedAt": "2026-06-10T00:00:00Z"
    }
  ]
}
```

---

## 5. Knowledge API

### POST /api/kb/sources

파일 또는 URL 지식 소스 등록.

### GET /api/kb/sources

지식 소스 목록.

### POST /api/kb/sources/:id/process

지식 소스 처리 요청.

### POST /api/kb/query

Request:
```json
{
  "workspaceId": "ws_123",
  "query": "욕실 방수 담수 테스트 순서",
  "filters": {
    "status": "approved",
    "sourceTypes": ["internal", "official", "manufacturer"]
  }
}
```

Response:
```json
{
  "answer": "욕실 방수 후 담수 테스트는...",
  "citations": [
    {
      "sourceId": "ks_123",
      "chunkId": "kc_123",
      "title": "욕실 방수 매뉴얼",
      "page": 4,
      "quote": "..."
    }
  ]
}
```

---

## 6. Image API

### POST /api/images/generate

Request:
```json
{
  "projectId": "project_123",
  "prompt": "화이트 오크 주방, 무광 세라믹 상판, 간접조명",
  "style": "interior_photorealistic",
  "count": 2,
  "size": "1024x1024"
}
```

### POST /api/images/inpaint

multipart 또는 signed URL 기반.

Request:
```json
{
  "imageAssetId": "img_123",
  "baseVersionId": "imgv_123",
  "maskUrl": "signed-mask-url",
  "prompt": "벽면 타일을 베이지 톤으로 변경",
  "insertIntoDocumentBlockId": "block_123"
}
```

---

## 7. Ontology API

### GET /api/ontology/graph

Query:
- workspaceId
- rootNodeId optional
- depth default 2
- status approved|candidate|all

### POST /api/ontology/nodes

### PATCH /api/ontology/nodes/:id

### POST /api/ontology/edges

### PATCH /api/ontology/edges/:id

### POST /api/ontology/extract

지식 소스 또는 문서에서 노드/엣지 후보 추출.

---

## 8. Export API

### POST /api/exports

Request:
```json
{
  "documentId": "doc_123",
  "format": "markdown",
  "template": "blog_basic"
}
```

Response:
```json
{
  "jobId": "export_123",
  "status": "queued"
}
```

### GET /api/exports/:jobId

Response:
```json
{
  "jobId": "export_123",
  "status": "done",
  "downloadUrl": "signed-url"
}
```

---

## 9. Messenger and Task API

### POST /api/channels

채널 생성.

### POST /api/channels/:id/messages

메시지 전송.

### POST /api/tasks

업무 생성.

Request:
```json
{
  "projectId": "project_123",
  "title": "무몰딩 인테리어 블로그 초안 작성",
  "description": "장단점, 시공 주의점, 상담 CTA 포함",
  "assigneeAgent": "content_agent",
  "requiresReview": true
}
```

### GET /api/tasks/:id

업무 상태와 산출물 조회.

### POST /api/tasks/:id/approve

업무 산출물 승인.
