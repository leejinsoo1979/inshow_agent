'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Black_Han_Sans } from 'next/font/google';
import { FiMoon, FiSun } from 'react-icons/fi';
import { HeroNetwork } from '@/components/landing/HeroNetwork';

/**
 * 랜딩 — 레이아웃은 v0-jarvis 레퍼런스 1:1, 콘텐츠는 ARCHI, 테마는 블랙&화이트.
 * 다크(기본) / 라이트 모드 토글, localStorage 저장.
 */

const display = Black_Han_Sans({ weight: '400', preload: false, display: 'swap' });

// 블랙&화이트 공용 토큰
const DOT = 'inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white';
const ACCENT = 'text-zinc-900 dark:text-white';
const BORDER = 'border-zinc-200 dark:border-white/10';
const GRID_BG = 'bg-zinc-200 dark:bg-white/10';
const CELL_BG = 'bg-white dark:bg-black';
const BTN_PRIMARY =
  'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200';
const BTN_OUTLINE =
  'border border-zinc-300 text-zinc-700 hover:border-zinc-900 dark:border-white/25 dark:text-zinc-200 dark:hover:border-white';

const TICKER = [
  '멀티 에이전트 라우팅',
  '블록 단위 문서 조립',
  '법규 답변 CITATION 강제',
  '온톨로지 지식 그래프',
  '이미지 생성 · 인페인트 버전 관리',
  'PDF · DOCX · MD · TXT · HTML 내보내기',
  '역할 기반 권한 (RBAC)',
  '전 작업 감사 로그',
];

const HERO_WORDS = ['조립하는', '작성하는', '검증하는', '축적하는'];

const MODULES = [
  {
    no: '01',
    tag: 'ORCHESTRATION',
    title: ['역할별', '멀티 에이전트'],
    desc: '콘텐츠팀, 법규팀, 시공디테일팀, 이미지팀, 지식관리팀, PM 에이전트가 같은 프로젝트 컨텍스트를 공유합니다. 요청을 분석해 맞는 팀으로 자동 라우팅하고, 실제 LLM API를 등록하면 역할별 페르소나로 동작합니다.',
    stat: '6',
    statLabel: '전문 에이전트',
  },
  {
    no: '02',
    tag: 'KNOWLEDGE',
    title: ['온톨로지', '메모리 엔진'],
    desc: '문서와 지식베이스에서 공간·공법·자재·하자·법규 개념을 자동 추출해 노드와 관계로 누적합니다. 모든 노드는 원본 블록·청크까지 추적되며, 옵시디언 스타일 그래프로 탐험합니다.',
    stat: '∞',
    statLabel: '지식 누적',
  },
  {
    no: '03',
    tag: 'EXECUTION',
    title: ['블록 실행', '레이어'],
    desc: '제목, 문단, 법규 출처, 계산식, 기준표, 차트, 도면, Q&A — 블록을 선택하고 지시하면 해당 블록에만 생성·수정됩니다. 문서가 메인이고, 채팅은 문서를 조작하는 인터페이스입니다.',
    stat: '11+',
    statLabel: '블록 타입',
  },
  {
    no: '04',
    tag: 'GOVERNANCE',
    title: ['승인 기반', '거버넌스'],
    desc: '모든 AI 액션은 미리보기 후 승인해야 문서에 반영됩니다. 출처 없는 법규 확답은 차단되고, 지식 소스는 검토자 승인 없이 검색에 사용되지 않으며, 모든 변경은 감사 로그로 남습니다.',
    stat: 'RBAC',
    statLabel: '역할 기반 권한',
  },
];

const STEPS = [
  {
    tag: 'DEFINE',
    no: '01',
    title: '문서 유형 선택',
    desc: '기술자료, 제안서, 블로그, 지식 노트 중 유형을 선택하면 문서코드·법규·계산식·기준표·Q&A 블록 구조가 템플릿으로 자동 구성됩니다.',
    code: [
      'POST /api/documents',
      '{',
      '  "title": "단열두께의 설계",',
      '  "type": "REPORT",',
      '  "withTemplate": true',
      '}',
      '',
      '// doc_meta → 법규 → 계산식 → 기준표',
      '// → 체크리스트 → Q&A → 출처 자동 구성',
    ],
  },
  {
    tag: 'COMPOSE',
    no: '02',
    title: 'AI와 블록 조립',
    desc: '블록을 선택하고 지시하면 역할별 에이전트가 글·표·차트·이미지를 생성합니다. 액션 미리보기를 확인하고 승인하면 문서에 반영됩니다.',
    code: [
      '{',
      '  "action_type": "insert_blocks",',
      '  "agent": "construction_agent",',
      '  "payload": { "blocks": [',
      '    { "type": "formula",',
      '      "content": { "expression": "U = 1 / Rtotal" } },',
      '    { "type": "table",',
      '      "content": { "title": "자재별 두께 산정표" } }',
      '  ] },',
      '  "requires_approval": true',
      '}',
    ],
  },
  {
    tag: 'PUBLISH',
    no: '03',
    title: '내보내기 · 지식화',
    desc: 'PDF, DOCX, Markdown, TXT, HTML로 배포합니다. 동시에 문서 속 개념이 온톨로지 그래프에 노드로 누적되어 다음 작업의 지식이 됩니다.',
    code: [
      'POST /api/exports',
      '{ "documentId": "doc_x", "format": "pdf" }',
      '',
      'POST /api/ontology/extract',
      '{ "documentId": "doc_x" }',
      '',
      '// 한글 폰트 내장 PDF · 표 변환 DOCX',
      '// 노드 7개 생성 · 관계 6개 연결',
    ],
  },
];

const AGENTS_GRID = [
  { name: '콘텐츠팀', code: 'CONTENT_AGENT', work: '블로그 · 제안서 · SEO 문구', trigger: '초안 작성 요청', load: 88 },
  { name: '법규팀', code: 'LEGAL_AGENT', work: '건축법 · 소방 · KEC 근거 답변', trigger: '법규 키워드 감지', load: 72 },
  { name: '시공디테일팀', code: 'CONSTRUCTION_AGENT', work: '방수 · 단열 · 공법 · 하자', trigger: '시공 키워드 감지', load: 79 },
  { name: '이미지팀', code: 'IMAGE_AGENT', work: '이미지 생성 · 인페인트 · 캡션', trigger: '이미지 요청', load: 54 },
  { name: '지식관리팀', code: 'KNOWLEDGE_AGENT', work: '노드 추출 · 중복 병합 · 검수함', trigger: '지식 키워드 감지', load: 65 },
  { name: 'PM 에이전트', code: 'PM_AGENT', work: '업무 생성 · 진행률 · 검수 요청', trigger: '@멘션 업무 지시', load: 41 },
];

const LIVE_METRICS = [
  { value: '11+', label: '블록 타입', sub: '계산식 · 기준표 · 차트 포함' },
  { value: '5', label: '내보내기 포맷', sub: 'PDF는 한글 폰트 내장' },
  { value: '99', label: '자동 테스트', sub: '권한 · 순서 · 스키마 · 인용 검증' },
  { value: '100%', label: '승인 기반 반영', sub: '승인 없는 문서 변경 0건' },
];

const INTEGRATIONS_A = [
  ['LLM', 'Anthropic Claude'],
  ['LLM', 'OpenAI (예정)'],
  ['DATABASE', 'PostgreSQL'],
  ['ORM', 'Prisma'],
  ['VECTOR', 'pgvector (예정)'],
  ['SEARCH', '법제처 API (예정)'],
  ['SEARCH', 'KCSC (예정)'],
  ['EXPORT', 'pdf-lib'],
  ['EXPORT', 'docx'],
  ['FRAMEWORK', 'Next.js'],
];

const INTEGRATIONS_B = [
  ['UI', 'Tailwind CSS'],
  ['UI', 'react-icons'],
  ['VALIDATION', 'Zod'],
  ['TEST', 'Vitest'],
  ['E2E', 'Playwright'],
  ['QUEUE', 'BullMQ (예정)'],
  ['CACHE', 'Redis (예정)'],
  ['STORAGE', 'S3 호환 (예정)'],
  ['DEPLOY', 'Vercel'],
  ['VCS', 'GitHub'],
];

const TRUST_CARDS = [
  {
    tag: 'ISOLATION',
    no: '01',
    title: '워크스페이스 격리',
    desc: '모든 API가 워크스페이스 권한을 검증합니다. 비멤버에게는 리소스 존재 자체를 숨기고(404), 다른 조직의 문서·이미지·지식에 접근할 수 없습니다.',
  },
  {
    tag: 'ACCESS CONTROL',
    no: '02',
    title: '역할별 권한 범위',
    desc: 'Owner, Admin, Editor, Viewer, Knowledge Reviewer 역할별로 가능한 작업이 다릅니다. Viewer는 AI를 쓸 수 없고, 지식 승인은 검토 권한자만 가능합니다.',
  },
  {
    tag: 'OBSERVABILITY',
    no: '03',
    title: '전체 감사 추적',
    desc: 'AI 액션의 제안·승인·실행·거절, 문서 변경, 지식 승인까지 행위자·대상·전후 상태가 모두 감사 로그로 기록됩니다.',
  },
  {
    tag: 'ENCRYPTION',
    no: '04',
    title: '키 암호화 저장',
    desc: '등록된 LLM API 키는 AES-256-GCM으로 암호화되어 저장되고, 화면에는 끝 4자리만 표시됩니다. 외부 콘텐츠는 프롬프트 인젝션 필터를 거칩니다.',
  },
];

const SDK_FEATURES = [
  { title: 'TypeScript 모노레포', no: '01', desc: 'strict 모드, 10개 워크스페이스 패키지로 경계 분리.' },
  { title: 'Provider Adapter', no: '02', desc: 'LLM·검색·이미지·임베딩을 어댑터로 추상화. 교체 자유.' },
  { title: 'Zod 이중 검증', no: '03', desc: '모든 AI 액션을 라우트와 서비스에서 재검증.' },
  { title: '99개 자동 테스트', no: '04', desc: '권한 우회 · 블록 순서 · 인용 강제까지 통합 테스트.' },
];

const SDK_TABS = [
  {
    tag: 'INSTALL',
    code: ['# 의존성 설치', 'npm install', '', '# 로컬 PostgreSQL (Docker)', 'npm run db:up && npm run db:migrate', '', '# 개발 서버', 'npm run dev'],
  },
  {
    tag: 'CREATE',
    code: ['POST /api/documents/doc_x/blocks', '{', '  "block": {', '    "type": "chart",', '    "content": {', '      "chartType": "bar",', '      "labels": ["철거", "목공"],', '      "series": [{ "values": [350, 980] }]', '} } }'],
  },
  {
    tag: 'ORCHESTRATE',
    code: ['POST /api/ai/chat', '{', '  "documentId": "doc_x",', '  "selectedBlockIds": ["blk_1"],', '  "message": "전문가 톤으로 바꿔줘"', '}', '', '// → 법규팀/콘텐츠팀 자동 라우팅'],
  },
  {
    tag: 'OBSERVE',
    code: ['SELECT action, "targetType", "createdAt"', 'FROM "AuditLog"', 'ORDER BY "createdAt" DESC;', '', '-- agent_action.execute', '-- knowledge_source.approve', '-- export.create'],
  },
];

const LOGOS = [
  'BLOCK_EDITOR',
  'AGENT_ROUTER',
  'ONTOLOGY_GRAPH',
  'KNOWLEDGE_BASE',
  'EXPORT_ENGINE',
  'IMAGE_STUDIO',
  'TASK_CENTER',
  'MESSENGER',
];

const PLANS = [
  {
    no: '01',
    name: 'STARTER',
    desc: '개인 전문가용',
    price: '₩0',
    period: '/월',
    features: ['프로젝트 3개', '문서 무제한 (블록 에디터)', 'mock 에이전트 체험', 'TXT · Markdown 내보내기', '커뮤니티 지원'],
    cta: '무료로 시작',
    popular: false,
  },
  {
    no: '02',
    name: 'PRO',
    desc: '실무 팀용',
    price: '₩49,000',
    period: '/월',
    features: ['프로젝트 무제한', 'LLM API 직접 등록 (Claude 등)', '전체 5종 포맷 내보내기', '지식베이스 + 온톨로지 그래프', '이미지 생성 · 인페인트', '메신저 + Task Center', '우선 지원'],
    cta: '체험 시작',
    popular: true,
  },
  {
    no: '03',
    name: 'ENTERPRISE',
    desc: '조직 단위 도입',
    price: '협의',
    period: '',
    features: ['Pro 전체 포함', '전용 인프라 · 온프레미스 옵션', 'SSO & 조직 권한 연동', '법규·시공 지식베이스 구축 지원', '전담 기술 지원', '맞춤 SLA 계약'],
    cta: '도입 문의',
    popular: false,
  },
];

const NAV_ITEMS: [string, string][] = [
  ['에이전트', '#agents'],
  ['플랫폼', '#platform'],
  ['프로세스', '#process'],
  ['메트릭', '#metrics'],
  ['연동', '#integrations'],
  ['보안', '#security'],
  ['구조', '#docs'],
  ['가격', '#pricing'],
];

export default function LandingPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [clock, setClock] = useState('--:--:--');
  const [heroWord, setHeroWord] = useState(0);
  const [step, setStep] = useState(0);
  const [sdkTab, setSdkTab] = useState(0);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const stored = window.localStorage.getItem('archi-theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('archi-theme', next);
      return next;
    });
  }

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Seoul' }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setHeroWord((w) => (w + 1) % HERO_WORDS.length), 2600);
    return () => clearInterval(timer);
  }, []);

  const activeStep = STEPS[step]!;
  const activeSdk = SDK_TABS[sdkTab]!;

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-white font-mono text-zinc-600 dark:bg-black dark:text-zinc-300">
        {/* ── 시스템 상태 바 */}
        <div className={`flex items-center justify-between border-b ${BORDER} px-5 py-1.5 text-[10px] tracking-[0.2em] text-zinc-500`}>
          <span>SYS:ARCHI-OS&nbsp;&nbsp;/&nbsp;&nbsp;BUILD 2026.06</span>
          <span className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className={DOT} />
              ALL_SYSTEMS_NOMINAL
            </span>
            <span suppressHydrationWarning>{clock} KST</span>
          </span>
        </div>

        {/* ── 네비게이션 */}
        <nav className={`sticky top-0 z-40 flex items-center gap-4 border-b ${BORDER} bg-white/90 px-5 py-3 backdrop-blur dark:bg-black/90`}>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center border border-zinc-900 dark:border-white">
              <span className="h-2.5 w-2.5 bg-zinc-900 dark:bg-white" />
            </span>
            <span className={`text-base font-black tracking-[0.2em] ${ACCENT}`}>ARCHI</span>
            <span className="hidden border-l border-zinc-300 pl-2.5 text-[9px] tracking-[0.25em] text-zinc-500 dark:border-white/15 lg:inline">
              AGENT STUDIO
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-5 text-[11px] tracking-[0.15em] text-zinc-500 dark:text-zinc-400 lg:flex">
            {NAV_ITEMS.map(([label, href]) => (
              <a key={label} href={href} className="hover:text-zinc-900 dark:hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            aria-label="테마 전환"
            className={`flex h-8 w-8 items-center justify-center border ${BORDER} text-zinc-500 hover:text-zinc-900 dark:hover:text-white`}
          >
            {theme === 'dark' ? <FiSun size={13} aria-hidden /> : <FiMoon size={13} aria-hidden />}
          </button>
          <Link href="/login" className={`px-4 py-2 text-[11px] font-bold tracking-[0.15em] ${BTN_OUTLINE}`}>
            로그인
          </Link>
          <Link href="/login" className={`px-4 py-2 text-[11px] font-bold tracking-[0.15em] ${BTN_PRIMARY}`}>
            무료로 시작 →
          </Link>
        </nav>

        {/* ── 히어로 */}
        <section id="agents" className={`relative overflow-hidden border-b ${BORDER} px-5 pb-24 pt-20 md:px-12 md:pt-28`}>
          <HeroNetwork dark={theme === 'dark'} />
          <div className="relative">
            <p className="mb-8 text-[10px] tracking-[0.3em] text-zinc-500">
              — ARCHI v1.0 · 건축·인테리어 AI 지식문서 플랫폼
            </p>
            <h1 className={`${display.className} text-[15vw] leading-[1.02] ${ACCENT} sm:text-7xl md:text-[6rem] lg:text-[7rem]`}>
              문서를 직접
              <br />
              <span className="text-ghost">{HERO_WORDS[heroWord]}</span>
              <br />
              AI 에이전트
            </h1>
            <p className="mt-10 max-w-xl text-[13px] leading-6 text-zinc-500 dark:text-zinc-400">
              기술자료, 시공기준, 법규 해설, 제안서를 블록 단위로 생성하고 모든 산출물을 온톨로지
              지식 그래프로 축적합니다. ARCHI는 건축·인테리어 전문가의 문서 생산과 지식관리를
              하나로 묶는 인프라입니다.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/login" className={`px-6 py-3.5 text-[12px] font-bold tracking-[0.1em] ${BTN_PRIMARY}`}>
                첫 문서 만들기&nbsp;&nbsp;→
              </Link>
              <Link href="/studio/ontology" className={`px-6 py-3.5 text-[12px] font-bold tracking-[0.1em] ${BTN_OUTLINE}`}>
                지식 그래프 보기&nbsp;&nbsp;→
              </Link>
            </div>
            <p className="mt-8 flex items-center gap-2 text-[10px] tracking-[0.15em] text-zinc-500">
              <span className={DOT} />
              승인 없이는 문서가 바뀌지 않습니다 — 전문가 검수 전제 설계
            </p>
          </div>
        </section>

        {/* ── 캐퍼빌리티 티커 */}
        <div className={`overflow-hidden border-b ${BORDER} py-3.5`}>
          <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap text-[10px] tracking-[0.2em] text-zinc-500">
            {[...TICKER, ...TICKER].map((tag, i) => (
              <span key={i} className="flex items-center gap-12">
                <span>{tag}</span>
                <span className={ACCENT}>/</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── CAPABILITIES */}
        <section id="platform" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>CAPABILITIES</SectionLabel>
          <h2 className={`${display.className} mb-4 text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
            ARCHI가
            <br />
            <span className="text-ghost">하는 일</span>
          </h2>
          <p className="mb-14 text-[10px] tracking-[0.25em] text-zinc-500">
            4개 핵심 모듈&nbsp;&nbsp;/&nbsp;&nbsp;전문가 검수 전제&nbsp;&nbsp;/&nbsp;&nbsp;프로덕션 동작
          </p>
          <div className={`border-t ${BORDER}`}>
            {MODULES.map((module) => (
              <div
                key={module.no}
                className={`grid items-center gap-6 border-b ${BORDER} py-8 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03] md:grid-cols-[48px_280px_1fr_200px] md:gap-10`}
              >
                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{module.no}</span>
                <div>
                  <p className={`mb-2 flex items-center gap-2 text-[10px] tracking-[0.25em] ${ACCENT}`}>
                    <span className={DOT} />
                    {module.tag}
                  </p>
                  <h3 className={`${display.className} text-3xl leading-[1.05] ${ACCENT}`}>
                    {module.title[0]}
                    <br />
                    {module.title[1]}
                  </h3>
                </div>
                <p className="max-w-xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">{module.desc}</p>
                <div className="md:text-right">
                  <p className={`${display.className} text-4xl ${ACCENT}`}>{module.stat}</p>
                  <p className="text-[10px] tracking-widest text-zinc-500">{module.statLabel}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-5 text-[10px] tracking-[0.15em]">
            <span className="text-zinc-500">전체 기능은 docs/PRD.md 참조 →</span>
            <Link href="/studio" className={`font-bold ${ACCENT}`}>
              직접 써보기
            </Link>
          </div>
        </section>

        {/* ── PROCESS */}
        <section id="process" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>PROCESS</SectionLabel>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <h2 className={`${display.className} text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              세 단계로
              <br />
              <span className="text-ghost">완성</span>
            </h2>
            <p className="text-[10px] tracking-[0.25em] text-zinc-500">정의&nbsp;&nbsp;·&nbsp;&nbsp;조립&nbsp;&nbsp;·&nbsp;&nbsp;배포</p>
          </div>
          <div className={`grid gap-px border ${BORDER} ${GRID_BG} lg:grid-cols-2`}>
            <div className={`flex flex-col ${CELL_BG}`}>
              {STEPS.map((s, i) => (
                <button
                  key={s.no}
                  onClick={() => setStep(i)}
                  className={`border-b ${BORDER} p-6 text-left transition last:border-b-0 ${
                    step === i ? 'bg-zinc-50 dark:bg-white/[0.04]' : 'hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
                    <span>{s.tag}</span>
                    <span>{s.no}</span>
                  </div>
                  <h3
                    className={`${display.className} text-2xl ${
                      step === i
                        ? `${ACCENT} underline decoration-zinc-900 decoration-2 underline-offset-8 dark:decoration-white`
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {s.title}
                  </h3>
                  {step === i && (
                    <>
                      <p className="mt-4 max-w-md text-xs leading-5 text-zinc-500 dark:text-zinc-400">{s.desc}</p>
                      <p className={`mt-5 text-[10px] font-bold tracking-[0.15em] ${ACCENT}`}>
                        스튜디오에서 해보기 →
                      </p>
                    </>
                  )}
                </button>
              ))}
              <p className="px-6 py-4 text-[10px] tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                STEP&nbsp;&nbsp;{activeStep.no} OF&nbsp;&nbsp;03
              </p>
            </div>
            <div className="bg-[#0a0a0c] p-6">
              <div className="mb-5 flex items-center justify-between text-[10px] tracking-widest">
                <span className="text-zinc-500">archi-request.http</span>
                <span className="flex items-center gap-1.5 text-white">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                  READY
                </span>
              </div>
              <pre className="overflow-x-auto text-[12px] leading-6">
                {activeStep.code.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-8 shrink-0 select-none text-right text-zinc-700">{i + 1}</span>
                    <span className={`pl-4 ${line.startsWith('//') ? 'text-zinc-600' : 'text-zinc-300'}`}>{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </section>

        {/* ── AGENT GRID */}
        <section className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>AGENT GRID</SectionLabel>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
            <h2 className={`${display.className} text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              한 팀처럼 움직이는
              <br />
              <span className="text-ghost">에이전트 그리드</span>
            </h2>
            <div className="flex gap-10 text-right">
              {[
                ['6', '전문 에이전트'],
                ['100%', '승인 기반 실행'],
                ['1.2s', '평균 라우팅'],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className={`${display.className} text-3xl ${ACCENT}`}>{value}</p>
                  <p className="text-[9px] tracking-[0.25em] text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`overflow-x-auto border ${BORDER}`}>
            <table className="w-full min-w-[680px] text-left text-[11px]">
              <thead>
                <tr className={`border-b ${BORDER} text-[9px] tracking-[0.25em] text-zinc-400 dark:text-zinc-600`}>
                  {['에이전트', '코드', '담당 업무', '트리거', '활용도'].map((header) => (
                    <th key={header} className="px-5 py-3 font-normal">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGENTS_GRID.map((row) => (
                  <tr
                    key={row.code}
                    className="border-b border-zinc-100 transition last:border-b-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className={`px-5 py-3.5 ${ACCENT}`}>{row.name}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{row.code}</td>
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-300">{row.work}</td>
                    <td className={`px-5 py-3.5 font-bold ${ACCENT}`}>{row.trigger}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1 w-24 bg-zinc-200 dark:bg-white/10">
                          <span className="block h-1 bg-zinc-900 dark:bg-white" style={{ width: `${row.load}%` }} />
                        </span>
                        <span className="text-zinc-500">{row.load}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pt-4 text-[10px] tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
            6개 에이전트 모두 같은 프로젝트 컨텍스트 공유&nbsp;&nbsp;·&nbsp;&nbsp;
            <span className={`font-bold ${ACCENT}`}>ALL_ROUTED</span>
          </p>
        </section>

        {/* ── METRICS */}
        <section id="metrics" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>METRICS</SectionLabel>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <h2 className={`${display.className} text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              측정 가능한
              <br />
              <span className="text-ghost">결과물</span>
            </h2>
            <p className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-zinc-500">
              <span className={`${DOT} animate-pulse`} />
              LIVE&nbsp;&nbsp;<span suppressHydrationWarning>{clock}</span>
            </p>
          </div>
          <div className={`grid grid-cols-2 gap-px border ${BORDER} ${GRID_BG} lg:grid-cols-4`}>
            {LIVE_METRICS.map((metric) => (
              <div key={metric.label} className={`${CELL_BG} p-8`}>
                <p className={`${display.className} text-4xl ${ACCENT}`}>{metric.value}</p>
                <p className="mt-2 text-[11px] tracking-[0.15em] text-zinc-600 dark:text-zinc-300">{metric.label}</p>
                <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">{metric.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.2em] text-zinc-500">
              <span>테스트 스위트 통과율</span>
              <span className={`font-bold ${ACCENT}`}>99 / 99</span>
            </div>
            <div className="flex h-7 items-end gap-[2px]">
              {Array.from({ length: 90 }, (_, i) => (
                <span
                  key={i}
                  className="flex-1 bg-zinc-900/80 dark:bg-white/70"
                  style={{ height: `${60 + ((i * 37) % 40)}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] tracking-widest text-zinc-400 dark:text-zinc-600">
              <span>Prompt 0</span>
              <span>오늘</span>
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS */}
        <section id="integrations" className={`overflow-hidden border-b ${BORDER} px-0 py-24`}>
          <div className="px-5 md:px-12">
            <SectionLabel>INTEGRATIONS</SectionLabel>
            <h2 className={`${display.className} mb-4 text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              당신의 스택과
              <br />
              <span className="text-ghost">연결됩니다</span>
            </h2>
            <p className="mb-12 text-[10px] tracking-[0.25em] text-zinc-500">
              PROVIDER ADAPTER 패턴&nbsp;&nbsp;/&nbsp;&nbsp;LLM, 검색, 이미지, 임베딩 교체 자유
            </p>
          </div>
          <div className="space-y-3">
            <div className="animate-marquee flex w-max gap-3">
              {[...INTEGRATIONS_A, ...INTEGRATIONS_A].map(([tag, name], i) => (
                <IntegrationChip key={`${name}-${i}`} tag={tag!} name={name!} />
              ))}
            </div>
            <div className="animate-marquee flex w-max gap-3 [animation-direction:reverse]">
              {[...INTEGRATIONS_B, ...INTEGRATIONS_B].map(([tag, name], i) => (
                <IntegrationChip key={`${name}-${i}`} tag={tag!} name={name!} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-5 pt-10 text-[10px] tracking-[0.2em] md:px-12">
            <span className="text-zinc-400 dark:text-zinc-600">제품 로직에 PROVIDER 종속 없음 — 어댑터만 교체</span>
            <span className={`font-bold ${ACCENT}`}>ARCHITECTURE.md →</span>
          </div>
        </section>

        {/* ── TRUST & SECURITY */}
        <section id="security" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>TRUST &amp; SECURITY</SectionLabel>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <h2 className={`${display.className} text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              신뢰할 수 있는
              <br />
              <span className="text-ghost">에이전트</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {['RBAC', 'AUDIT_LOG', 'AES_256_GCM', 'RATE_LIMIT', 'INJECTION_FILTER'].map((cert) => (
                <span key={cert} className={`border ${BORDER} px-3 py-1.5 text-[9px] tracking-[0.2em] text-zinc-500 dark:text-zinc-400`}>
                  {cert}
                </span>
              ))}
            </div>
          </div>
          <div className={`grid gap-px border ${BORDER} ${GRID_BG} md:grid-cols-2 lg:grid-cols-4`}>
            {TRUST_CARDS.map((card) => (
              <div key={card.no} className={`${CELL_BG} p-7`}>
                <DotPattern seed={Number(card.no)} />
                <p className="mb-1 mt-6 flex items-center justify-between text-[10px] tracking-[0.25em]">
                  <span className={`flex items-center gap-2 ${ACCENT}`}>
                    <span className={DOT} />
                    {card.tag}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-600">{card.no}</span>
                </p>
                <h3 className={`${display.className} mb-3 text-xl ${ACCENT}`}>{card.title}</h3>
                <p className="text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 text-[10px] tracking-[0.15em]">
            <span className="text-zinc-400 dark:text-zinc-600">모든 AI 액션은 승인 전에는 실행되지 않습니다</span>
            <span className={`font-bold ${ACCENT}`}>SECURITY_REVIEW.md →</span>
          </div>
        </section>

        {/* ── DEVELOPER */}
        <section id="docs" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>DEVELOPER</SectionLabel>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className={`${display.className} mb-6 text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
                개발자를 위한
                <br />
                <span className="text-ghost">구조</span>
              </h2>
              <p className="mb-10 max-w-md text-xs leading-6 text-zinc-500 dark:text-zinc-400">
                Next.js + PostgreSQL/Prisma 모노레포. 모든 AI 액션은 스키마로 검증되고, 모든
                provider는 어댑터 뒤에 있습니다. 클론 후 10분 안에 로컬에서 전체 기능이 돕니다.
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-7">
                {SDK_FEATURES.map((feature) => (
                  <div key={feature.no}>
                    <p className="mb-1 flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${ACCENT}`}>{feature.title}</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-600">{feature.no}</span>
                    </p>
                    <p className="text-[10px] leading-4 text-zinc-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex gap-6 text-[10px] tracking-[0.15em]">
                <span className={`font-bold ${ACCENT}`}>docs/ARCHITECTURE.md →</span>
                <span className="text-zinc-500 dark:text-zinc-400">GITHUB ↗</span>
              </div>
            </div>
            <div className={`border ${BORDER} bg-[#0a0a0c]`}>
              <div className="flex border-b border-white/10 text-[10px] tracking-[0.2em]">
                {SDK_TABS.map((tab, i) => (
                  <button
                    key={tab.tag}
                    onClick={() => setSdkTab(i)}
                    className={`border-r border-white/10 px-4 py-3 ${
                      sdkTab === i ? 'bg-white/[0.06] text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.tag}
                  </button>
                ))}
              </div>
              <pre className="min-h-[260px] overflow-x-auto p-6 text-[12px] leading-6">
                {activeSdk.code.map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-6 shrink-0 select-none text-right text-zinc-700">{i + 1}</span>
                    <span
                      className={`pl-4 ${
                        line.startsWith('#') || line.startsWith('--') || line.startsWith('//')
                          ? 'text-zinc-600'
                          : 'text-zinc-300'
                      }`}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </pre>
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[10px] tracking-[0.2em]">
                <span className="text-zinc-500">@archi/* · v0.1.0 · monorepo</span>
                <span className="flex items-center gap-1.5 text-white">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                  STABLE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── VISION */}
        <section className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <div className="mb-10 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
            <SectionLabel inline>PRODUCT VISION</SectionLabel>
            <span>01 / 01</span>
          </div>
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className={`${display.className} max-w-3xl text-3xl leading-[1.3] ${ACCENT} md:text-4xl`}>
                “AI가 답변하는 화면이 아니라,
                <br />
                AI가 문서를 직접 조립하는 화면을 만듭니다.”
              </p>
              <div className="mt-8 flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center border ${BORDER} text-xs ${ACCENT}`}>A</span>
                <div>
                  <p className={`text-xs font-bold ${ACCENT}`}>ARCHI Agent Studio</p>
                  <p className="text-[10px] tracking-[0.2em] text-zinc-500">
                    CLIENT PROPOSAL&nbsp;&nbsp;·&nbsp;&nbsp;v2 PREMIUM
                  </p>
                </div>
              </div>
            </div>
            <div className={`border ${BORDER} p-8`}>
              <p className="text-[10px] tracking-[0.25em] text-zinc-500">KEY_RESULT</p>
              <p className={`${display.className} mt-3 text-6xl ${ACCENT}`}>12/12</p>
              <p className="mt-1 text-[10px] tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                실행 프롬프트 전체 구현 완료
              </p>
            </div>
          </div>
          <div className={`mt-14 overflow-hidden border-t ${BORDER} pt-6`}>
            <div className="animate-marquee flex w-max gap-14 text-[10px] tracking-[0.3em] text-zinc-400 dark:text-zinc-600">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <span key={i}>{logo}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING */}
        <section id="pricing" className={`border-b ${BORDER} px-5 py-24 md:px-12`}>
          <SectionLabel>PRICING</SectionLabel>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <h2 className={`${display.className} text-5xl leading-[0.98] ${ACCENT} md:text-7xl`}>
              문서는 늘리고,
              <br />
              <span className="text-ghost">비용은 줄이고.</span>
            </h2>
            <div className={`flex items-center border ${BORDER} text-[10px] tracking-[0.15em]`}>
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 ${
                  billing === 'monthly' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-500'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`flex items-center gap-2 px-4 py-2 ${
                  billing === 'annual' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'text-zinc-500'
                }`}
              >
                연간
                <span className="text-[8px] font-bold">20%_할인</span>
              </button>
            </div>
          </div>
          <div className={`grid gap-px border ${BORDER} ${GRID_BG} lg:grid-cols-3`}>
            {PLANS.map((plan) => (
              <div
                key={plan.no}
                className={`relative ${CELL_BG} p-8 ${
                  plan.popular ? 'outline outline-1 outline-zinc-900 dark:outline-white' : ''
                }`}
              >
                <div className="mb-6 flex items-center justify-between text-[10px] tracking-[0.25em]">
                  <span className="text-zinc-400 dark:text-zinc-600">{plan.no}</span>
                  {plan.popular && (
                    <span className="bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-white dark:bg-white dark:text-black">
                      인기
                    </span>
                  )}
                </div>
                <h3 className={`${display.className} text-2xl ${ACCENT}`}>{plan.name}</h3>
                <p className="mt-1 text-[11px] text-zinc-500">{plan.desc}</p>
                <p className={`${display.className} mt-6 text-4xl ${ACCENT}`}>
                  {plan.price === '₩49,000' && billing === 'annual' ? '₩39,000' : plan.price}
                  <span className="ml-1 text-xs text-zinc-500">{plan.period}</span>
                </p>
                <ul className="mt-7 space-y-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <span className={`font-bold ${ACCENT}`}>+</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/studio"
                  className={`mt-8 block py-3 text-center text-[11px] font-bold tracking-[0.15em] ${
                    plan.popular ? BTN_PRIMARY : BTN_OUTLINE
                  }`}
                >
                  {plan.cta}&nbsp;&nbsp;→
                </Link>
              </div>
            ))}
          </div>
          <p className="pt-6 text-center text-[10px] tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
            모든 플랜에 API 키 암호화 · 감사 로그 · 승인 워크플로 포함
          </p>
        </section>

        {/* ── FINAL CTA */}
        <section className={`border-b ${BORDER} px-5 py-28 text-center md:px-12`}>
          <p className="mb-8 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500">
            <span className={DOT} />
            ARCHI RUNTIME · READY
          </p>
          <h2 className={`${display.className} text-6xl leading-[0.98] ${ACCENT} md:text-8xl`}>
            당신의 첫
            <br />
            <span className="text-ghost">기술문서</span>
            <br />
            지금 시작.
          </h2>
          <p className="mx-auto mt-8 max-w-md text-xs leading-6 text-zinc-500 dark:text-zinc-400">
            이메일 하나로 바로 시작합니다. 문서 유형을 고르면 블록 템플릿이 깔리고, AI 에이전트가
            첫 초안을 제안합니다. 승인 전에는 아무것도 바뀌지 않습니다.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/studio" className={`px-7 py-3.5 text-[12px] font-bold tracking-[0.1em] ${BTN_PRIMARY}`}>
              첫 문서 만들기&nbsp;&nbsp;→
            </Link>
            <Link href="/studio/settings" className={`px-7 py-3.5 text-[12px] font-bold tracking-[0.1em] ${BTN_OUTLINE}`}>
              LLM API 등록&nbsp;&nbsp;→
            </Link>
          </div>
          <div className={`mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-px border ${BORDER} ${GRID_BG} md:grid-cols-4`}>
            {[
              ['11+', '블록 타입'],
              ['6', '전문 에이전트'],
              ['5', '내보내기 포맷'],
              ['99', '자동 테스트'],
            ].map(([value, label]) => (
              <div key={label} className={`${CELL_BG} p-5`}>
                <p className={`${display.className} text-2xl ${ACCENT}`}>{value}</p>
                <p className="mt-1 text-[9px] tracking-[0.2em] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 푸터 */}
        <footer className="px-5 py-16 md:px-12">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center border border-zinc-900 dark:border-white">
                  <span className="h-2.5 w-2.5 bg-zinc-900 dark:bg-white" />
                </span>
                <span className={`text-base font-black tracking-[0.2em] ${ACCENT}`}>ARCHI</span>
              </div>
              <p className="max-w-xs text-[11px] leading-5 text-zinc-500">
                건축·인테리어 전문가가 AI 에이전트와 함께 기술문서를 만들고 지식을 축적하는 전문
                워크스페이스.
              </p>
              <div className="mt-6 flex gap-5 text-[10px] tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                <span className="hover:text-zinc-900 dark:hover:text-white">GITHUB ↗</span>
                <span className="hover:text-zinc-900 dark:hover:text-white">BLOG ↗</span>
                <span className="hover:text-zinc-900 dark:hover:text-white">CONTACT ↗</span>
              </div>
            </div>
            {(
              [
                ['플랫폼', ['블록 에디터', 'AI 에이전트', '지식베이스', '온톨로지', '메신저 · 작업센터']],
                ['문서', ['PRD', '아키텍처', 'API 명세', '데이터 모델', '보안 리뷰']],
                ['바로가기', ['스튜디오', '지식 그래프', 'LLM API 등록', '내보내기', '설정']],
              ] as const
            ).map(([title, items]) => (
              <div key={title}>
                <p className="mb-4 text-[10px] tracking-[0.3em] text-zinc-400 dark:text-zinc-600">{title}</p>
                <ul className="space-y-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {items.map((item) => (
                    <li key={item} className="cursor-pointer hover:text-zinc-900 dark:hover:text-white">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={`mt-14 flex flex-wrap items-center justify-between gap-3 border-t ${BORDER} pt-6 text-[9px] tracking-[0.25em] text-zinc-400 dark:text-zinc-600`}>
            <span>© 2026 ARCHI AGENT STUDIO</span>
            <span className="flex items-center gap-1.5">
              <span className={DOT} />
              ALL_SYSTEMS_NOMINAL
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ children, inline }: { children: string; inline?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500 ${inline ? '' : 'mb-5'}`}>
      <span className={DOT} />
      {children}
    </p>
  );
}

function IntegrationChip({ tag, name }: { tag: string; name: string }) {
  return (
    <span className="flex shrink-0 items-center gap-3 border border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="text-[8px] tracking-[0.2em] text-zinc-400 dark:text-zinc-600">{tag}</span>
      <span className="text-xs text-zinc-700 dark:text-zinc-200">{name}</span>
    </span>
  );
}

/** 시큐리티 카드 상단 도트 패턴 */
function DotPattern({ seed }: { seed: number }) {
  return (
    <div className="flex h-4 items-end gap-1.5">
      {Array.from({ length: 12 }, (_, i) => {
        const on = (i * 7 + seed * 5) % 3 !== 0;
        return (
          <span
            key={i}
            className={`inline-block h-1 w-1 rounded-full ${
              on
                ? i % 4 === seed % 4
                  ? 'bg-zinc-900 dark:bg-white'
                  : 'bg-zinc-400 dark:bg-white/35'
                : 'bg-zinc-200 dark:bg-white/10'
            }`}
            style={{ marginBottom: `${(i * 5 + seed * 3) % 8}px` }}
          />
        );
      })}
    </div>
  );
}
