# ARCHI Agent Studio Product Package

이 패키지는 건축·인테리어 전문 AI 서비스 개발을 위한 PRD와 개발 실행 문서 모음이다.

## 포함 파일

| 파일 | 용도 |
|---|---|
| `PRD.md` | 제품 요구사항 정의서 |
| `ARCHITECTURE.md` | 시스템 아키텍처와 기술 구조 |
| `DEVELOPMENT_PLAN.md` | 단계별 개발 기획안 |
| `API_SPEC.md` | 초기 API 명세 |
| `DATA_MODEL.md` | 데이터 모델 초안 |
| `CLAUDE.md` | Claude Code 프로젝트 지침 파일 |
| `CLAUDE_CODE_EXECUTION_PROMPTS.md` | Claude Code에 붙여넣을 구현 프롬프트 |
| `BACKLOG.csv` | Epic/Story 기반 개발 백로그 |

## 추천 사용법

1. 새 Git repository를 만든다.
2. 이 패키지의 `docs` 파일들을 repository의 `/docs` 폴더에 넣는다.
3. `CLAUDE.md`를 repository root에 둔다.
4. Claude Code에서 `/init`을 실행하거나, `CLAUDE.md`를 기준으로 프로젝트를 시작한다.
5. `CLAUDE_CODE_EXECUTION_PROMPTS.md`의 Prompt 0부터 순서대로 실행한다.
6. 각 단계마다 테스트와 git commit을 진행한다.

## 제품 한 줄 정의

건축·인테리어 전문가가 AI 직원과 대화하며 글, 이미지, 법규 지식, 시공 디테일, 업무 산출물을 생성·수정·축적하는 전문 AI 워크스페이스.
