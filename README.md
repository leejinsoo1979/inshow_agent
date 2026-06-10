# ARCHI Agent Studio

건축·인테리어 전문가가 AI 직원과 대화하며 글, 이미지, 법규 지식, 시공 디테일, 업무 산출물을 생성·수정·축적하는 전문 AI 워크스페이스.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 정의서 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처와 기술 구조 |
| [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | 단계별 개발 기획안 |
| [docs/API_SPEC.md](docs/API_SPEC.md) | 초기 API 명세 |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | 데이터 모델 초안 |
| [docs/CLAUDE_CODE_EXECUTION_PROMPTS.md](docs/CLAUDE_CODE_EXECUTION_PROMPTS.md) | Claude Code 구현 프롬프트 (Prompt 0부터 순서대로 실행) |
| [docs/BACKLOG.csv](docs/BACKLOG.csv) | Epic/Story 기반 개발 백로그 |
| [docs/ARCHI_AGENT_STUDIO_COMBINED.md](docs/ARCHI_AGENT_STUDIO_COMBINED.md) | 전체 문서 통합본 |

프로젝트 지침은 루트의 [CLAUDE.md](CLAUDE.md)를 따른다.

## 시작하기

```bash
# 1. 의존성 설치 (npm workspaces 모노레포)
npm install

# 2. 로컬 PostgreSQL 실행 (Docker 필요)
npm run db:up

# 3. 환경 변수 설정
cp .env.example .env

# 4. DB 마이그레이션
npm run db:migrate

# 5. 개발 서버 실행
npm run dev
```

## 구조

```
apps/web          Next.js 웹앱 (UI + API Route Handlers)
packages/db       Prisma schema, migrations, db client
packages/shared   공용 타입, zod 스키마, 에러/권한 모델
packages/ai       LLM provider adapter, agent action
packages/editor   블록 스키마와 에디터 유틸
packages/export   TXT/Markdown/PDF exporter
```

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | 전체 테스트 (vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run db:up` / `db:down` | 로컬 Postgres 시작/종료 |
| `npm run db:migrate` | Prisma 마이그레이션 |
