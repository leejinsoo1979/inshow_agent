'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * 랜딩 페이지 — 참고: https://v0-jarvis-ruby.vercel.app/ (터미널/OS 감성, 블랙 + 블루 액센트)
 * 콘텐츠는 ARCHI Agent Studio (건축·인테리어 AI 지식문서 플랫폼) 기준.
 */

const ACCENT = 'text-[#4d8dff]';

const TICKER_TAGS = [
  '블록 단위 문서 조립',
  '멀티 에이전트 라우팅',
  '법규 답변 CITATION 강제',
  '온톨로지 지식 그래프',
  '이미지 생성 · 인페인트 버전 관리',
  'PDF · DOCX · MD · TXT · HTML EXPORT',
  '워크스페이스 RBAC',
  '전 작업 감사 로그',
];

const MODULES = [
  {
    no: '01',
    tag: 'ORCHESTRATION',
    title: ['역할별', '멀티 에이전트'],
    desc: '콘텐츠팀, 법규팀, 시공디테일팀, 이미지팀, 지식관리팀, PM 에이전트가 같은 프로젝트 컨텍스트를 공유하며 요청을 자동 라우팅합니다.',
    stat: '6',
    statLabel: '전문 에이전트',
  },
  {
    no: '02',
    tag: 'KNOWLEDGE',
    title: ['온톨로지', '메모리 엔진'],
    desc: '문서·지식베이스에서 공법, 자재, 하자, 법규 노드를 자동 추출하고 관계로 연결합니다. 모든 노드는 원본 블록까지 추적됩니다.',
    stat: '∞',
    statLabel: '지식 누적',
  },
  {
    no: '03',
    tag: 'EXECUTION',
    title: ['블록 단위', '문서 조립'],
    desc: '제목, 법규 기준, 계산식, 기준표, 차트, 도면, Q&A까지 — 블록을 선택하고 AI에게 지시하면 해당 블록에만 생성·수정됩니다.',
    stat: '11+',
    statLabel: '블록 타입',
  },
  {
    no: '04',
    tag: 'GOVERNANCE',
    title: ['승인 기반', '워크플로'],
    desc: '모든 AI 액션은 미리보기 후 승인해야 문서에 반영됩니다. 출처 없는 법규 확답은 차단되고, 모든 변경은 감사 로그로 남습니다.',
    stat: 'RBAC',
    statLabel: '역할 기반 권한',
  },
];

const STEPS = [
  {
    no: '01',
    tag: 'DEFINE',
    title: '문서 유형 선택',
    desc: '기술자료, 제안서, 블로그 중 선택하면 문서코드·법규·계산식·기준표 블록 구조가 자동 구성됩니다.',
  },
  {
    no: '02',
    tag: 'COMPOSE',
    title: 'AI와 블록 조립',
    desc: '블록을 선택하고 지시하면 역할별 에이전트가 글·표·차트·이미지를 생성합니다. 승인하면 문서에 반영됩니다.',
  },
  {
    no: '03',
    tag: 'PUBLISH',
    title: '내보내기 · 지식화',
    desc: 'PDF/DOCX/MD/TXT/HTML로 배포하고, 문서의 개념은 온톨로지 그래프에 자동 누적됩니다.',
  },
];

const METRICS = [
  { value: '11+', label: '블록 타입' },
  { value: '5', label: 'EXPORT 포맷' },
  { value: '6', label: '역할 에이전트' },
  { value: '99', label: '자동 테스트' },
];

export default function LandingPage() {
  const [clock, setClock] = useState('--:--:--');

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050507] font-mono text-zinc-300">
      {/* 시스템 상태 바 */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-1.5 text-[10px] tracking-widest text-zinc-500">
        <span>SYS:ARCHI-OS / BUILD 2026.06</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4d8dff]" />
            ALL_SYSTEMS_NOMINAL
          </span>
          <span suppressHydrationWarning>{clock} KST</span>
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex items-center gap-6 border-b border-white/10 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center border border-[#4d8dff] text-xs font-black text-[#4d8dff]">
            A
          </span>
          <span className="text-sm font-black tracking-widest text-white">ARCHI</span>
          <span className="hidden border-l border-white/15 pl-2.5 text-[10px] tracking-widest text-zinc-500 sm:inline">
            AGENT STUDIO
          </span>
        </Link>
        <div className="ml-auto hidden items-center gap-5 text-[11px] tracking-widest text-zinc-400 md:flex">
          {['에이전트', '블록에디터', '지식그래프', '내보내기', '보안'].map((item) => (
            <span key={item} className="cursor-default hover:text-white">
              {item}
            </span>
          ))}
        </div>
        <Link
          href="/studio"
          className="hidden text-[11px] tracking-widest text-zinc-300 hover:text-white sm:inline"
        >
          SIGN_IN
        </Link>
        <Link
          href="/studio"
          className="bg-[#4d8dff] px-4 py-2 text-[11px] font-bold tracking-widest text-black hover:bg-[#6da3ff]"
        >
          스튜디오_열기 →
        </Link>
      </nav>

      {/* 히어로 */}
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-20 md:px-10 md:py-28">
        <GridDots />
        <p className="mb-6 text-[11px] tracking-[0.3em] text-zinc-500">
          — ARCHI v1.0 · 건축·인테리어 AI 지식문서 플랫폼
        </p>
        <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl md:text-8xl">
          문서를 직접
          <br />
          <span className={ACCENT}>조립하는</span>
          <br />
          <span className="text-ghost">AI 에이전트</span>
        </h1>
        <p className="mt-8 max-w-xl text-[13px] leading-6 text-zinc-400">
          기술자료, 시공기준, 법규 해설, 제안서를 블록 단위로 생성하고, 모든 산출물을 온톨로지
          지식 그래프로 축적하는 전문가용 AI 워크스페이스.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/studio"
            className="bg-white px-6 py-3 text-xs font-bold tracking-widest text-black hover:bg-zinc-200"
          >
            첫 문서 만들기 →
          </Link>
          <Link
            href="/studio/ontology"
            className="border border-white/25 px-6 py-3 text-xs font-bold tracking-widest text-zinc-200 hover:border-white"
          >
            지식 그래프 보기 →
          </Link>
        </div>
      </section>

      {/* 캐퍼빌리티 티커 */}
      <div className="overflow-hidden border-b border-white/10 py-3">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap text-[11px] tracking-[0.25em] text-zinc-500">
          {[...TICKER_TAGS, ...TICKER_TAGS].map((tag, i) => (
            <span key={i} className="flex items-center gap-10">
              <span>{tag.toUpperCase()}</span>
              <span className="text-[#4d8dff]">/</span>
            </span>
          ))}
        </div>
      </div>

      {/* 핵심 모듈 */}
      <section className="border-b border-white/10 px-5 py-20 md:px-10">
        <SectionLabel>CAPABILITIES</SectionLabel>
        <h2 className="mb-3 text-4xl font-black tracking-tight text-white md:text-6xl">
          ARCHI가
          <br />
          <span className="text-ghost">하는 일</span>
        </h2>
        <p className="mb-12 text-[10px] tracking-[0.3em] text-zinc-500">
          4개 핵심 모듈 / 전문가 검수 전제 / 프로덕션 동작
        </p>
        <div className="grid border-t border-white/10 md:grid-cols-2">
          {MODULES.map((module) => (
            <div
              key={module.no}
              className="group border-b border-white/10 p-7 transition hover:bg-white/[0.03] md:odd:border-r"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-zinc-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4d8dff]" />
                  {module.tag}
                </span>
                <span className="text-[10px] text-zinc-600">{module.no}</span>
              </div>
              <h3 className="mb-4 text-2xl font-black leading-7 tracking-tight text-white">
                {module.title[0]}
                <br />
                {module.title[1]}
              </h3>
              <p className="mb-6 max-w-md text-xs leading-5 text-zinc-400">{module.desc}</p>
              <p className={`text-3xl font-black ${ACCENT}`}>{module.stat}</p>
              <p className="text-[10px] tracking-widest text-zinc-500">{module.statLabel}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3단계 프로세스 */}
      <section className="border-b border-white/10 px-5 py-20 md:px-10">
        <SectionLabel>PROCESS</SectionLabel>
        <h2 className="mb-12 text-4xl font-black tracking-tight text-white md:text-6xl">
          세 단계로
          <br />
          <span className="text-ghost">완성</span>
        </h2>
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid bg-[#050507]">
            {STEPS.map((step) => (
              <div key={step.no} className="border-b border-white/10 p-6 last:border-b-0">
                <div className="mb-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
                  <span>{step.tag}</span>
                  <span>{step.no}</span>
                </div>
                <h3 className="mb-2 text-lg font-black text-white">{step.title}</h3>
                <p className="text-xs leading-5 text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#0a0a0e] p-6">
            <div className="mb-4 flex items-center justify-between text-[10px] tracking-widest">
              <span className="text-zinc-500">agent-action.json</span>
              <span className="flex items-center gap-1.5 text-[#4d8dff]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4d8dff]" />
                READY
              </span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-5 text-zinc-400">
              <code>{`{
  "action_type": "insert_blocks",
  "agent": "construction_agent",   // 시공디테일팀
  "payload": {
    "blocks": [
      { "type": "formula",
        "content": { "expression": "U = 1 / Rtotal" } },
      { "type": "table",
        "content": { "title": "자재별 두께 산정표" } },
      { "type": "source_reference",
        "content": { "title": "관련 법규 검토" } }
    ]
  },
  "requires_approval": true        // 승인 후에만 반영
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* 지표 */}
      <section className="border-b border-white/10 px-5 py-16 md:px-10">
        <SectionLabel>METRICS</SectionLabel>
        <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label} className="bg-[#050507] p-8 text-center">
              <p className={`text-4xl font-black ${ACCENT}`}>{metric.value}</p>
              <p className="mt-2 text-[10px] tracking-[0.25em] text-zinc-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 인용 */}
      <section className="border-b border-white/10 px-5 py-20 text-center md:px-10">
        <p className="mx-auto max-w-2xl text-xl font-black leading-8 text-white md:text-2xl">
          “AI가 답변하는 화면이 아니라,
          <br />
          <span className={ACCENT}>AI가 문서를 직접 조립하는 화면</span>을 만듭니다.”
        </p>
        <p className="mt-4 text-[10px] tracking-[0.3em] text-zinc-500">
          ARCHI AGENT STUDIO — CLIENT PROPOSAL v2
        </p>
      </section>

      {/* 푸터 */}
      <footer className="flex flex-col items-center gap-4 px-5 py-10 text-[10px] tracking-widest text-zinc-600 md:flex-row md:justify-between md:px-10">
        <span>© 2026 ARCHI AGENT STUDIO</span>
        <span className="flex gap-5">
          <Link href="/studio" className="hover:text-white">
            스튜디오
          </Link>
          <Link href="/studio/knowledge" className="hover:text-white">
            지식베이스
          </Link>
          <Link href="/studio/ontology" className="hover:text-white">
            온톨로지
          </Link>
          <Link href="/studio/settings" className="hover:text-white">
            설정
          </Link>
        </span>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4d8dff]" />
      {children}
    </p>
  );
}

/** 히어로 배경: 점 그리드 (참고 사이트의 constellation 느낌을 가볍게) */
function GridDots() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      aria-hidden
    >
      <defs>
        <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,0.10)" />
        </pattern>
        <radialGradient id="fade" cx="80%" cy="20%" r="80%">
          <stop offset="0%" stopColor="rgba(77,141,255,0.16)" />
          <stop offset="60%" stopColor="rgba(77,141,255,0)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
      <rect width="100%" height="100%" fill="url(#fade)" />
    </svg>
  );
}
