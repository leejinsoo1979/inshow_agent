# ARCHI 로컬 컴패니언 워커

내 컴퓨터에서 **Codex / Claude 구독 계정 CLI**를 구동해 ARCHI 웹의 작업을 처리하는 사이드카(헤르메스 방식).
웹 서버가 직접 구독 로그인을 못 하므로, 로그인은 이 워커가 도는 *내 머신*에서 일어난다. 토큰은 `~/.archi-companion.json`에만 저장되고 서버로 전송되지 않는다.

## 사전 준비
워커 머신에 CLI를 설치하고 구독 계정으로 로그인:
```bash
# Codex
codex login
# 또는 Claude Code
claude login   # (claude /login)
```

## 연결
1. 웹 **설정 → 기기 연결**에서 `+ 기기 추가` → 6자리 페어링 코드 발급
2. 워커 머신에서:
```bash
node apps/companion/index.mjs pair <코드> --url https://<배포주소>
node apps/companion/index.mjs run
```

## 동작
- `run` 루프가 3초마다 `/api/companion/jobs/next`를 폴링
- 작업이 있으면 `codex exec "<prompt>"`(또는 `claude -p`) 실행 후 결과를 `/api/companion/jobs/<id>/result`로 회신
- 웹은 작업을 큐에 넣고 결과를 폴링해 문서/태스크에 반영(승인 후 적용)

## 테스트(도구 없이)
`ARCHI_COMPANION_CMD`로 실행 명령을 임시 대체할 수 있다:
```bash
ARCHI_COMPANION_CMD="echo" node apps/companion/index.mjs run
```
