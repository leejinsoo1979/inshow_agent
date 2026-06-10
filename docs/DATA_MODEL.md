# ARCHI Agent Studio Data Model Draft

**버전:** v1.0  
**목적:** PostgreSQL/Prisma 기준 초기 데이터 모델 설계

---

## 1. Prisma 스타일 모델 초안

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  createdAt     DateTime @default(now())
  memberships   Membership[]
  chatMessages  ChatMessage[]
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  workspaces  Workspace[]
  members     Membership[]
}

model Membership {
  id             String @id @default(cuid())
  userId         String
  organizationId String
  role           Role
  user           User @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
}

enum Role {
  OWNER
  ADMIN
  EDITOR
  VIEWER
  KNOWLEDGE_REVIEWER
}

model Workspace {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  createdAt      DateTime @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
  projects       Project[]
  knowledgeSources KnowledgeSource[]
  ontologyNodes  OntologyNode[]
}

model Project {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  clientName  String?
  location    String?
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  documents   Document[]
  images      ImageAsset[]
  tasks       Task[]
}

model Document {
  id          String   @id @default(cuid())
  projectId   String
  title       String
  type        DocumentType @default(BLOG_POST)
  status      DocumentStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  project     Project @relation(fields: [projectId], references: [id])
  blocks      DocumentBlock[]
  chatSessions ChatSession[]
  exports     ExportJob[]
}

enum DocumentType {
  BLOG_POST
  PROPOSAL
  REPORT
  SNS_CAPTION
  KNOWLEDGE_NOTE
}

enum DocumentStatus {
  DRAFT
  NEEDS_REVIEW
  APPROVED
  ARCHIVED
}

model DocumentBlock {
  id          String   @id @default(cuid())
  documentId  String
  type        String
  sortOrder   Int
  content     Json
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  document    Document @relation(fields: [documentId], references: [id])
  citations   Citation[]
}

model ChatSession {
  id          String   @id @default(cuid())
  documentId  String?
  projectId   String?
  title       String?
  createdAt   DateTime @default(now())
  document    Document? @relation(fields: [documentId], references: [id])
  messages    ChatMessage[]
}

model ChatMessage {
  id            String   @id @default(cuid())
  chatSessionId String
  userId        String?
  role          MessageRole
  content       Json
  createdAt     DateTime @default(now())
  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id])
  user          User? @relation(fields: [userId], references: [id])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
  TOOL
}

model AgentAction {
  id           String @id @default(cuid())
  chatSessionId String?
  type         String
  payload      Json
  status       AgentActionStatus @default(PROPOSED)
  createdAt    DateTime @default(now())
  executedAt   DateTime?
}

enum AgentActionStatus {
  PROPOSED
  APPROVED
  EXECUTED
  REJECTED
  FAILED
}

model KnowledgeSource {
  id          String @id @default(cuid())
  workspaceId String
  title       String
  sourceType  KnowledgeSourceType
  uri         String?
  fileKey     String?
  status      KnowledgeStatus @default(PENDING_PROCESSING)
  trustLevel  TrustLevel @default(INTERNAL_UNVERIFIED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  chunks      KnowledgeChunk[]
}

enum KnowledgeSourceType {
  FILE
  URL
  OFFICIAL_LAW
  KCSC
  MANUFACTURER
  INTERNAL_MANUAL
  WEB
}

enum KnowledgeStatus {
  PENDING_PROCESSING
  PROCESSING
  PENDING_REVIEW
  APPROVED
  ARCHIVED
  FAILED
}

enum TrustLevel {
  OFFICIAL
  MANUFACTURER
  INTERNAL_APPROVED
  INTERNAL_UNVERIFIED
  WEB_UNVERIFIED
}

model KnowledgeChunk {
  id          String @id @default(cuid())
  sourceId    String
  text        String
  page        Int?
  section     String?
  tokenCount  Int?
  embedding   Unsupported("vector")?
  metadata    Json?
  source      KnowledgeSource @relation(fields: [sourceId], references: [id])
  citations   Citation[]
}

model Citation {
  id        String @id @default(cuid())
  blockId   String?
  chunkId   String?
  url       String?
  title     String
  publisher String?
  quote     String?
  createdAt DateTime @default(now())
  block     DocumentBlock? @relation(fields: [blockId], references: [id])
  chunk     KnowledgeChunk? @relation(fields: [chunkId], references: [id])
}

model OntologyNode {
  id          String @id @default(cuid())
  workspaceId String
  label       String
  type        String
  description String?
  status      OntologyStatus @default(CANDIDATE)
  confidence  Float?
  metadata    Json?
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}

model OntologyEdge {
  id          String @id @default(cuid())
  workspaceId String
  sourceNodeId String
  targetNodeId String
  relationType String
  status      OntologyStatus @default(CANDIDATE)
  confidence  Float?
  evidence    Json?
}

enum OntologyStatus {
  CANDIDATE
  APPROVED
  REJECTED
  ARCHIVED
}

model ImageAsset {
  id          String @id @default(cuid())
  projectId   String?
  workspaceId String
  title       String?
  source      ImageSource
  createdAt   DateTime @default(now())
  project     Project? @relation(fields: [projectId], references: [id])
  versions    ImageVersion[]
}

enum ImageSource {
  UPLOADED
  GENERATED
  INPAINTED
}

model ImageVersion {
  id          String @id @default(cuid())
  imageAssetId String
  fileKey     String
  prompt      String?
  maskFileKey String?
  provider    String?
  model       String?
  width       Int?
  height      Int?
  createdAt   DateTime @default(now())
  imageAsset  ImageAsset @relation(fields: [imageAssetId], references: [id])
}

model Task {
  id          String @id @default(cuid())
  projectId   String?
  title       String
  description String?
  assigneeAgent String?
  status      TaskStatus @default(QUEUED)
  output      Json?
  requiresReview Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  project     Project? @relation(fields: [projectId], references: [id])
  events      TaskEvent[]
}

enum TaskStatus {
  QUEUED
  RUNNING
  BLOCKED
  NEEDS_REVIEW
  DONE
  FAILED
  CANCELED
}

model TaskEvent {
  id        String @id @default(cuid())
  taskId    String
  type      String
  payload   Json?
  createdAt DateTime @default(now())
  task      Task @relation(fields: [taskId], references: [id])
}

model ExportJob {
  id          String @id @default(cuid())
  documentId  String
  format      ExportFormat
  status      ExportStatus @default(QUEUED)
  fileKey     String?
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
  document    Document @relation(fields: [documentId], references: [id])
}

enum ExportFormat {
  TXT
  MARKDOWN
  PDF
  DOCX
  HTML
}

enum ExportStatus {
  QUEUED
  RUNNING
  DONE
  FAILED
}
```

---

## 2. Block Content JSON 예시

### Heading

```json
{
  "level": 1,
  "text": "34평 아파트 거실 리모델링 사례"
}
```

### Paragraph

```json
{
  "text": "이번 현장은 구축 아파트의 답답한 거실 구조를 개선하고...",
  "tone": "professional",
  "seoKeywords": ["34평 아파트 리모델링", "거실 인테리어"]
}
```

### Image

```json
{
  "imageAssetId": "img_123",
  "versionId": "imgv_123",
  "url": "signed-or-public-url",
  "caption": "간접조명을 적용한 미니멀 거실"
}
```

### Source Reference

```json
{
  "title": "관련 법규 검토",
  "summary": "방화문 교체 시에는 방화성능과 인증 여부 확인이 필요합니다.",
  "citations": ["citation_123"]
}
```

---

## 3. 인덱스 권장

- DocumentBlock: `(documentId, sortOrder)`
- ChatMessage: `(chatSessionId, createdAt)`
- KnowledgeChunk: vector index on embedding
- KnowledgeSource: `(workspaceId, status, sourceType)`
- OntologyNode: `(workspaceId, type, status)`
- OntologyEdge: `(workspaceId, sourceNodeId, targetNodeId, relationType)`
- Task: `(projectId, status, updatedAt)`
- ExportJob: `(documentId, status)`

---

## 4. 마이그레이션 원칙

1. AI 관련 JSON payload는 초기에는 유연성을 위해 JSON으로 저장한다.
2. 안정화된 필드는 점진적으로 column으로 승격한다.
3. 지식베이스 chunk와 citation은 삭제보다 archive를 우선한다.
4. 이미지 원본은 절대 덮어쓰지 않고 version을 추가한다.
5. 법규/공식 소스는 retrievedAt, effectiveDate, publisher를 반드시 저장한다.
