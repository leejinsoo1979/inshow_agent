# Security & Quality Review (Prompt 11)

**검토일:** 2026-06-10
**범위:** Prompt 0~10에서 구현된 MVP 전체

## 1. 발견한 리스크와 조치

### 즉시 수정 (High)

| # | 리스크 | 조치 |
|---|---|---|
| H1 | dev-login이 프로덕션에서도 열려 있어 임의 사용자로 로그인 가능 | `isDevLoginAllowed()` 게이트 추가 — production에서는 `ALLOW_DEV_LOGIN=true` 명시 없이는 403 |
| H2 | 인증/AI/이미지/업로드 엔드포인트에 rate limit 없음 → 자원 고갈/크레딧 남용 | 인메모리 sliding-window rate limiter 적용: dev-login 10/분(IP), ai/chat 30/분, 이미지 생성/인페인트 10/분, KB 업로드 10/분(사용자) |
| H3 | 외부 검색 결과·업로드 문서 본문이 필터 없이 LLM 컨텍스트/응답에 유입 (prompt injection) | `@archi/security`의 `sanitizeUntrustedText` — 영/한 지시문 패턴 차단, 유사 시스템 태그 제거, zero-width 문자 제거, 길이 제한. 검색 결과(agent)와 KB 질의 응답에 적용 |
| H4 | export 시 `javascript:`/`data:` URL이 Markdown 산출물에 그대로 포함 | `safeUrlOrEmpty` — http/https/상대경로만 허용, 이미지/CTA URL에 적용 |
| H5 | 세션 쿠키 `secure` 플래그 누락 | production에서 `secure: true` 설정 |

### 기존 구현에서 확인된 안전장치 (변경 없음)

- 모든 workspace/project/document API가 `requireWorkspaceCapability` 계열 헬퍼로 권한 검증 (비멤버에게는 404로 존재 은닉)
- AgentAction은 저장 전·실행 전 이중 zod 검증 + action type allowlist
- 승인 없는 문서 변경 금지 (PROPOSED → 승인 시에만 실행, 거절/중복 처리 차단)
- 법규/공법 답변 citation 강제 (출처 없으면 확답 거부)
- KB 소스 자동 승인 금지 (APPROVE_KNOWLEDGE 권한자만, EDITOR 불가 테스트 존재)
- 인페인트는 항상 새 ImageVersion 생성, 원본 불변 (byte 단위 테스트)
- 파일 업로드 확장자 allowlist + 20MB 제한, storage key 경로 탈출 방지
- 민감 mutation 전반에 AuditLog (actor/action/target/before/after)
- 실패 응답 표준 구조 `{ code, message, details }` + 한국어 메시지

## 2. 백로그 (Medium/Low — 이슈로 관리)

| # | 항목 | 비고 |
|---|---|---|
| B1 | rate limiter Redis 전환 | 다중 인스턴스 배포 시 인메모리 한계 |
| B2 | 업로드 파일 magic-byte 검증 | 현재 확장자 검사만 수행 |
| B3 | 실제 인증 공급자 도입 (Auth.js/Clerk 등) | dev-login은 MVP 한정 |
| B4 | CSRF 토큰 | 현재 SameSite=Lax + JSON Content-Type으로 완화 |
| B5 | 이미지/Export 파일 signed URL + 짧은 만료 | 현재 세션 기반 서빙 |
| B6 | 임베딩 pgvector 전환 + 실제 embedding provider | 현재 Json 컬럼 + mock |
| B7 | Export/AI 장기 작업 queue worker (BullMQ) 이전 | 현재 동기 실행 |
| B8 | 채널 메시지 audit log + 보존 정책 | |
| B9 | E2E 테스트 (문서 생성 → AI 삽입 → export 다운로드) | 현재 service-level 통합 테스트 67+개 |
| B10 | RAG 품질 평가 (법규 golden Q&A, 출처 포함률) | ARCHITECTURE.md 10장 |

## 3. 테스트 현황

- `apps/web/lib/security.test.ts`: dev-login 게이트, rate limiter, export URL sanitize
- `packages/security/src/sanitize.test.ts`: injection 패턴(영/한), zero-width, 길이 제한, URL 검증
- 전체 suite: 권한 우회/순서 보존/액션 스키마/citation 강제/승인 워크플로 포함
