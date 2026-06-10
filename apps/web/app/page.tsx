'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import { HeroNetwork } from '@/components/landing/HeroNetwork';

/**
 * 1:1 클론 — https://v0-jarvis-ruby.vercel.app/
 * 섹션/카피/레이아웃/인터랙션을 원본 그대로 재현한다.
 */

const display = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });

const BLUE = '#3b82f6';

const TICKER = [
  'MULTI-AGENT ORCHESTRATION',
  'LONG-HORIZON REASONING',
  'PERSISTENT MEMORY',
  'TOOL EXECUTION ENGINE',
  'SOC 2 CERTIFIED',
  'EDGE-NATIVE RUNTIME',
  '1.2B+ ACTIONS/DAY',
  'ZERO-TRUST SANDBOXING',
];

const HERO_WORDS = ['ORCHESTRATE', 'ADAPT', 'REASON', 'EXECUTE'];

const MODULES = [
  {
    no: '01',
    tag: 'ORCHESTRATION',
    title: ['MULTI-AGENT', 'SWARMS'],
    desc: 'Deploy fleets of specialized agents that collaborate, delegate, and self-coordinate. JARVIS manages task graphs, resolves dependencies, and routes work to the right agent — automatically.',
    stat: '10K+',
    statLabel: 'concurrent agents',
  },
  {
    no: '02',
    tag: 'COGNITION',
    title: ['LONG-HORIZON', 'REASONING'],
    desc: 'Persistent memory, reflective loops, multi-step planning. Not one-shot completions — agents that hold context across hours, days, and complex workflows without losing the thread.',
    stat: '∞',
    statLabel: 'context retention',
  },
  {
    no: '03',
    tag: 'EXECUTION',
    title: ['TOOL &', 'API LAYER'],
    desc: 'Give your agents hands. Browse the web, call APIs, write and run code, query databases, trigger stack actions — all with built-in retries, rate limiting, and full audit logging.',
    stat: '200+',
    statLabel: 'native tool integrations',
  },
  {
    no: '04',
    tag: 'SECURITY',
    title: ['ZERO-TRUST', 'SANDBOX'],
    desc: 'Every agent action is sandboxed, policy-controlled, and cryptographically audited. Define permission scopes, SOC 2 Type II, end-to-end encryption. Enterprise-grade from day one.',
    stat: 'SOC2',
    statLabel: 'type II certified',
  },
];

const STEPS = [
  {
    tag: 'DEFINE',
    no: '01',
    title: 'DECLARE YOUR AGENTS',
    desc: 'Describe what each agent should do in natural language or YAML. Assign tools, memory scopes, and permission boundaries. JARVIS handles the runtime.',
    code: [
      "import { jarvis } from '@jarvis/sdk'",
      '',
      'const researcher = jarvis.agent({',
      "  name: 'researcher',",
      "  role: 'Gather and verify facts',",
      "  tools: ['web.search', 'db.query'],",
      "  memory: { scope: 'session' }",
      '})',
      '',
      '// Agent is ready to spawn',
    ],
  },
  {
    tag: 'COMPOSE',
    no: '02',
    title: 'WIRE THE WORKFLOW',
    desc: 'Chain agents into task graphs with dependencies, fan-out, and human-in-the-loop gates. JARVIS resolves execution order and routes outputs automatically.',
    code: [
      'const pipeline = jarvis.workflow({',
      '  graph: {',
      '    research: researcher,',
      '    draft:    writer.after(researcher),',
      '    review:   critic.after(writer),',
      '  },',
      "  onBlock: 'human-approval',",
      '})',
      '',
      '// 3 agents wired · 0 cycles detected',
    ],
  },
  {
    tag: 'DEPLOY',
    no: '03',
    title: 'SHIP TO PRODUCTION',
    desc: 'Push to production with one command. JARVIS handles horizontal scaling, queue management, full observability, and cost controls across all your agents.',
    code: [
      'await jarvis.deploy({',
      "  env: 'production',",
      '  scaling: { min: 2, max: 500 },',
      "  regions: ['us-east', 'eu-west'],",
      "  monitoring: 'full-trace',",
      '})',
      '',
      '// 12 regions · 99.97% SLA',
      '// < 80ms agent spawn time',
    ],
  },
];

const REGIONS = [
  { location: 'San Francisco', region: 'US-WEST-1', agents: '2,400', latency: '12ms', load: 72 },
  { location: 'New York', region: 'US-EAST-1', agents: '3,100', latency: '18ms', load: 88 },
  { location: 'London', region: 'EU-WEST-1', agents: '2,800', latency: '24ms', load: 65 },
  { location: 'Frankfurt', region: 'EU-CENTRAL-1', agents: '1,900', latency: '28ms', load: 54 },
  { location: 'Tokyo', region: 'AP-EAST-1', agents: '2,200', latency: '32ms', load: 79 },
  { location: 'Sydney', region: 'AP-SOUTH-1', agents: '900', latency: '45ms', load: 41 },
];

const LIVE_METRICS = [
  { value: '1.5M+', label: 'AGENT ACTIONS / DAY', sub: 'across all running pipelines' },
  { value: '99.97%', label: 'COMPLETION RATE', sub: 'out of 10,000 tasks' },
  { value: '< 80ms', label: 'AVG SPAWN TIME', sub: 'from trigger to live agent' },
  { value: '12K+', label: 'PEAK CONCURRENCY', sub: 'simultaneous agents' },
];

const INTEGRATIONS_A = [
  ['LLM', 'OpenAI'],
  ['LLM', 'Anthropic'],
  ['LLM', 'Mistral'],
  ['LLM', 'Gemini'],
  ['DATABASE', 'PostgreSQL'],
  ['CACHE', 'Redis'],
  ['DATABASE', 'MongoDB'],
  ['VECTOR DB', 'Pinecone'],
  ['CODE', 'GitHub'],
  ['CODE', 'GitLab'],
];

const INTEGRATIONS_B = [
  ['COMMS', 'Slack'],
  ['KNOWLEDGE', 'Notion'],
  ['TASKS', 'Linear'],
  ['TASKS', 'Jira'],
  ['PAYMENTS', 'Stripe'],
  ['STORAGE', 'AWS S3'],
  ['EDGE', 'Cloudflare'],
  ['OBSERVABILITY', 'Datadog'],
  ['MESSAGING', 'Twilio'],
  ['CRM', 'HubSpot'],
];

const TRUST_CARDS = [
  {
    tag: 'ISOLATION',
    no: '01',
    title: 'AGENT SANDBOXING',
    desc: 'Every agent runs in an isolated execution environment. No cross-contamination, no data leakage between pipelines.',
  },
  {
    tag: 'ACCESS CONTROL',
    no: '02',
    title: 'PERMISSION SCOPES',
    desc: 'Define exactly what tools, APIs, and data each agent can access. Least-privilege by default, audited always.',
  },
  {
    tag: 'OBSERVABILITY',
    no: '03',
    title: 'FULL AUDIT TRAIL',
    desc: 'Every agent action, decision, and tool call is logged, traceable, and reviewable in real time. Fully immutable.',
  },
  {
    tag: 'COMPLIANCE',
    no: '04',
    title: 'ENTERPRISE CERTS',
    desc: 'SOC 2 Type II, ISO 27001, HIPAA, GDPR, and CCPA compliance. Independently audited with continuous monitoring.',
  },
];

const SDK_FEATURES = [
  { title: 'TypeScript native', no: '01', desc: 'Full type-safety, auto-generated types from your schema.' },
  { title: 'Streaming output', no: '02', desc: 'Real-time agent thoughts via SSE and WebSockets.' },
  { title: 'Edge-compatible', no: '03', desc: 'Node, Deno, Bun, Cloudflare Workers, Vercel Edge.' },
  { title: '8KB gzipped', no: '04', desc: 'Lightweight core. Tree-shakeable plugins.' },
];

const SDK_TABS = [
  {
    tag: 'INSTALL',
    code: ['# npm', 'npm install @jarvis/sdk', '', '# pnpm', 'pnpm add @jarvis/sdk', '', '# yarn', 'yarn add @jarvis/sdk'],
  },
  {
    tag: 'CREATE',
    code: ["import { jarvis } from '@jarvis/sdk'", '', 'const agent = jarvis.agent({', "  name: 'analyst',", "  tools: ['web.search'],", '})'],
  },
  {
    tag: 'ORCHESTRATE',
    code: ['const flow = jarvis.workflow({', '  graph: { analyst, writer },', '})', '', 'await flow.run(input)'],
  },
  {
    tag: 'OBSERVE',
    code: ['for await (const e of flow.trace()) {', '  console.log(e.agent, e.action)', '}', '', '// full-trace · immutable log'],
  },
];

const LOGOS = [
  'MERIDIAN_LABS',
  'FLUX_SYSTEMS',
  'BEACON_AI',
  'PRISM_ANALYTICS',
  'NOVA_INTELLIGENCE',
  'QUANTUM_AGENTS',
  'ATLAS_DIGITAL',
  'VERTEX_AI_CO',
];

const PLANS = [
  {
    no: '01',
    name: 'STARTER',
    desc: 'Explore agentic AI',
    price: '$0',
    period: '/MONTH',
    features: ['Up to 5 agents', '10K agent actions / month', '3 tool integrations', 'Community support', 'Basic observability'],
    cta: 'START FREE',
    popular: false,
  },
  {
    no: '02',
    name: 'PRO',
    desc: 'Agents in production',
    price: '$39',
    period: '/MONTH',
    features: ['Unlimited agents', '5M agent actions / month', '50+ integrations', 'Priority support', 'Full audit trail', 'Multi-agent workflows', 'Custom memory scopes'],
    cta: 'START TRIAL',
    popular: true,
  },
  {
    no: '03',
    name: 'ENTERPRISE',
    desc: 'Scale without limits',
    price: 'CUSTOM',
    period: '',
    features: ['Everything in Pro', 'Unlimited agent actions', 'Dedicated infrastructure', '24/7 dedicated support', 'On-premise option', 'Custom SLA guarantee', 'SSO & SCIM', 'Custom contracts'],
    cta: 'CONTACT SALES',
    popular: false,
  },
];

const NAV_ITEMS = ['AGENTS', 'PLATFORM', 'INFRA', 'METRICS', 'INTEGRATIONS', 'SECURITY', 'DOCS', 'PRICING'];

export default function LandingPage() {
  const [clock, setClock] = useState('--:--:--');
  const [heroWord, setHeroWord] = useState(0);
  const [step, setStep] = useState(0);
  const [sdkTab, setSdkTab] = useState(0);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' }));
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
    <div className="min-h-screen bg-black font-mono text-zinc-300">
      {/* ── 시스템 상태 바 */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-1.5 text-[10px] tracking-[0.2em] text-zinc-500">
        <span>SYS:JARVIS-OS&nbsp;&nbsp;/&nbsp;&nbsp;BUILD 2025.04</span>
        <span className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
            ALL_SYSTEMS_NOMINAL
          </span>
          <span suppressHydrationWarning>{clock} UTC</span>
        </span>
      </div>

      {/* ── 네비게이션 */}
      <nav className="sticky top-0 z-40 flex items-center gap-4 border-b border-white/10 bg-black/90 px-5 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center border"
            style={{ borderColor: BLUE }}
          >
            <span className="h-2.5 w-2.5" style={{ background: BLUE }} />
          </span>
          <span className="text-base font-black tracking-[0.2em] text-white">JARVIS</span>
          <span className="hidden border-l border-white/15 pl-2.5 text-[9px] tracking-[0.25em] text-zinc-500 lg:inline">
            AGENTIC AI
          </span>
        </Link>
        <div className="ml-auto hidden items-center gap-5 text-[10px] tracking-[0.2em] text-zinc-400 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white">
              {item}
            </a>
          ))}
        </div>
        <Link href="/studio" className="hidden text-[10px] tracking-[0.2em] text-zinc-300 hover:text-white sm:inline">
          SIGN_IN
        </Link>
        <Link
          href="/studio"
          className="px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-black hover:opacity-90"
          style={{ background: BLUE }}
        >
          DEPLOY_NOW →
        </Link>
      </nav>

      {/* ── 히어로 */}
      <section id="agents" className="relative overflow-hidden border-b border-white/10 px-5 pb-24 pt-20 md:px-12 md:pt-28">
        <HeroNetwork />
        <div className="relative">
          <p className="mb-8 text-[10px] tracking-[0.3em] text-zinc-500">
            — JARVIS v4.0 · AGENTIC AI PLATFORM
          </p>
          <h1 className={`${display.className} text-[17vw] uppercase leading-[0.9] text-white sm:text-7xl md:text-[6.5rem] lg:text-[7.5rem]`}>
            AGENTS THAT
            <br />
            <span style={{ color: BLUE }}>{HERO_WORDS[heroWord]}</span>
            <br />
            AUTONOMOUSLY
          </h1>
          <p className="mt-10 max-w-xl text-[13px] leading-6 text-zinc-400">
            Build, orchestrate, and scale fleets of autonomous AI agents. JARVIS is the
            infrastructure layer for agentic workflows that think, plan, and deliver at enterprise
            scale.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/studio"
              className="bg-white px-6 py-3.5 text-[11px] font-bold tracking-[0.2em] text-black hover:bg-zinc-200"
            >
              DEPLOY FIRST AGENT&nbsp;&nbsp;→
            </Link>
            <Link
              href="/studio"
              className="border border-white/25 px-6 py-3.5 text-[11px] font-bold tracking-[0.2em] text-zinc-200 hover:border-white"
            >
              READ THE DOCS&nbsp;&nbsp;→
            </Link>
          </div>
          <p className="mt-8 flex items-center gap-2 text-[10px] tracking-[0.2em] text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
            4,200+ engineers deployed this week
          </p>
        </div>
      </section>

      {/* ── 캐퍼빌리티 티커 */}
      <div className="overflow-hidden border-b border-white/10 py-3.5">
        <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap text-[10px] tracking-[0.3em] text-zinc-500">
          {[...TICKER, ...TICKER].map((tag, i) => (
            <span key={i} className="flex items-center gap-12">
              <span>{tag}</span>
              <span style={{ color: BLUE }}>/</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── CAPABILITIES */}
      <section id="platform" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>CAPABILITIES</SectionLabel>
        <h2 className={`${display.className} mb-4 text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
          WHAT JARVIS
          <br />
          <span className="text-ghost">CAN DO</span>
        </h2>
        <p className="mb-14 text-[10px] tracking-[0.3em] text-zinc-500">
          FOUR CORE MODULES&nbsp;&nbsp;/&nbsp;&nbsp;ENTERPRISE-GRADE&nbsp;&nbsp;/&nbsp;&nbsp;PRODUCTION-READY
        </p>
        <div className="border-t border-white/10">
          {MODULES.map((module) => (
            <div
              key={module.no}
              className="grid items-center gap-6 border-b border-white/10 py-8 transition hover:bg-white/[0.03] md:grid-cols-[48px_280px_1fr_200px] md:gap-10"
            >
              <span className="text-[10px] text-zinc-600">{module.no}</span>
              <div>
                <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.25em]" style={{ color: BLUE }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
                  {module.tag}
                </p>
                <h3 className={`${display.className} text-3xl uppercase leading-[0.95] text-white`}>
                  {module.title[0]}
                  <br />
                  {module.title[1]}
                </h3>
              </div>
              <p className="max-w-xl text-xs leading-5 text-zinc-400">{module.desc}</p>
              <div className="md:text-right">
                <p className={`${display.className} text-4xl`} style={{ color: BLUE }}>
                  {module.stat}
                </p>
                <p className="text-[10px] tracking-widest text-zinc-500">{module.statLabel}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-5 text-[10px] tracking-[0.2em]">
          <span className="text-zinc-500">VIEW ALL CAPABILITIES IN DOCS →</span>
          <span style={{ color: BLUE }}>EXPLORE SDK</span>
        </div>
      </section>

      {/* ── PROCESS */}
      <section id="infra" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>PROCESS</SectionLabel>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className={`${display.className} text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            SHIP IN
            <br />
            <span className="text-ghost">THREE STEPS</span>
          </h2>
          <p className="text-[10px] tracking-[0.3em] text-zinc-500">DEFINE&nbsp;&nbsp;·&nbsp;&nbsp;COMPOSE&nbsp;&nbsp;·&nbsp;&nbsp;DEPLOY</p>
        </div>
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
          <div className="flex flex-col bg-black">
            {STEPS.map((s, i) => (
              <button
                key={s.no}
                onClick={() => setStep(i)}
                className={`border-b border-white/10 p-6 text-left transition last:border-b-0 ${
                  step === i ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
                  <span>{s.tag}</span>
                  <span>{s.no}</span>
                </div>
                <h3
                  className={`${display.className} text-2xl uppercase ${
                    step === i ? 'text-white underline decoration-2 underline-offset-8' : 'text-zinc-500'
                  }`}
                  style={step === i ? { textDecorationColor: BLUE } : undefined}
                >
                  {s.title}
                </h3>
                {step === i && (
                  <>
                    <p className="mt-4 max-w-md text-xs leading-5 text-zinc-400">{s.desc}</p>
                    <p className="mt-5 text-[10px] tracking-[0.2em]" style={{ color: BLUE }}>
                      READ DOCS →
                    </p>
                  </>
                )}
              </button>
            ))}
            <p className="px-6 py-4 text-[10px] tracking-[0.25em] text-zinc-600">
              STEP&nbsp;&nbsp;{activeStep.no} OF&nbsp;&nbsp;03
            </p>
          </div>
          <div className="bg-[#060608] p-6">
            <div className="mb-5 flex items-center justify-between text-[10px] tracking-widest">
              <span className="text-zinc-500">agent-config.ts</span>
              <span className="flex items-center gap-1.5" style={{ color: BLUE }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
                READY
              </span>
            </div>
            <pre className="overflow-x-auto text-[12px] leading-6">
              {activeStep.code.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 shrink-0 select-none text-right text-zinc-700">{i + 1}</span>
                  <span className="pl-4 text-zinc-300">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </section>

      {/* ── NETWORK */}
      <section className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>NETWORK</SectionLabel>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
          <h2 className={`${display.className} text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            GLOBAL
            <br />
            <span className="text-ghost">AGENT GRID</span>
          </h2>
          <div className="flex gap-10 text-right">
            {[
              ['17', 'DATA CENTERS'],
              ['99.97%', 'SLA UPTIME'],
              ['< 50ms', 'GLOBAL P99'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className={`${display.className} text-3xl text-white`}>{value}</p>
                <p className="text-[9px] tracking-[0.25em] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[640px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/10 text-[9px] tracking-[0.25em] text-zinc-600">
                {['LOCATION', 'REGION', 'AGENTS', 'LATENCY', 'LOAD'].map((header) => (
                  <th key={header} className="px-5 py-3 font-normal">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((row) => (
                <tr key={row.region} className="border-b border-white/5 transition last:border-b-0 hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 text-zinc-200">{row.location}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{row.region}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{row.agents}</td>
                  <td className="px-5 py-3.5" style={{ color: BLUE }}>
                    {row.latency}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="h-1 w-24 bg-white/10">
                        <span className="block h-1" style={{ width: `${row.load}%`, background: BLUE }} />
                      </span>
                      <span className="text-zinc-500">{row.load}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-4 text-[10px] tracking-[0.25em] text-zinc-600">
          SHOWING 6 OF 17 ACTIVE REGIONS&nbsp;&nbsp;·&nbsp;&nbsp;
          <span style={{ color: BLUE }}>ALL_HEALTHY</span>
        </p>
      </section>

      {/* ── LIVE METRICS */}
      <section id="metrics" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>LIVE METRICS</SectionLabel>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className={`${display.className} text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            SCALE YOU
            <br />
            <span className="text-ghost">CAN MEASURE</span>
          </h2>
          <p className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: BLUE }} />
            LIVE&nbsp;&nbsp;<span suppressHydrationWarning>{clock}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 lg:grid-cols-4">
          {LIVE_METRICS.map((metric) => (
            <div key={metric.label} className="bg-black p-8">
              <p className={`${display.className} text-4xl`} style={{ color: BLUE }}>
                {metric.value}
              </p>
              <p className="mt-2 text-[10px] tracking-[0.25em] text-zinc-300">{metric.label}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{metric.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
            <span>UPTIME LAST 90 DAYS</span>
            <span style={{ color: BLUE }}>99.97%</span>
          </div>
          <div className="flex h-7 items-end gap-[2px]">
            {Array.from({ length: 90 }, (_, i) => (
              <span
                key={i}
                className="flex-1"
                style={{
                  height: `${60 + ((i * 37) % 40)}%`,
                  background: (i * 13) % 23 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(59,130,246,0.75)',
                }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] tracking-widest text-zinc-600">
            <span>90 days</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS */}
      <section id="integrations" className="overflow-hidden border-b border-white/10 px-0 py-24">
        <div className="px-5 md:px-12">
          <SectionLabel>INTEGRATIONS</SectionLabel>
          <h2 className={`${display.className} mb-4 text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            YOUR ENTIRE
            <br />
            <span className="text-ghost">STACK. CONNECTED.</span>
          </h2>
          <p className="mb-12 text-[10px] tracking-[0.3em] text-zinc-500">
            200+ NATIVE INTEGRATIONS&nbsp;&nbsp;/&nbsp;&nbsp;LLMs, DATABASES, APIs, TOOLS
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
        <div className="flex items-center justify-between px-5 pt-10 text-[10px] tracking-[0.25em] md:px-12">
          <span className="text-zinc-600">+ 180 MORE INTEGRATIONS IN THE REGISTRY</span>
          <span style={{ color: BLUE }}>BROWSE ALL →</span>
        </div>
      </section>

      {/* ── TRUST & SECURITY */}
      <section id="security" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>TRUST &amp; SECURITY</SectionLabel>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className={`${display.className} text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            AGENTS YOU
            <br />
            <span className="text-ghost">CAN TRUST</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {['SOC_2_TYPE_II', 'ISO_27001', 'HIPAA', 'GDPR', 'CCPA'].map((cert) => (
              <span key={cert} className="border border-white/15 px-3 py-1.5 text-[9px] tracking-[0.2em] text-zinc-400">
                {cert}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {TRUST_CARDS.map((card) => (
            <div key={card.no} className="bg-black p-7">
              <DotPattern seed={Number(card.no)} />
              <p className="mb-1 mt-6 flex items-center justify-between text-[10px] tracking-[0.25em]">
                <span className="flex items-center gap-2" style={{ color: BLUE }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
                  {card.tag}
                </span>
                <span className="text-zinc-600">{card.no}</span>
              </p>
              <h3 className={`${display.className} mb-3 text-xl uppercase text-white`}>{card.title}</h3>
              <p className="text-[11px] leading-5 text-zinc-400">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 text-[10px] tracking-[0.2em]">
          <span className="text-zinc-600">EVERY AGENT ACTION IS CRYPTOGRAPHICALLY SIGNED &amp; IMMUTABLY LOGGED</span>
          <span style={{ color: BLUE }}>SECURITY WHITEPAPER →</span>
        </div>
      </section>

      {/* ── DEVELOPER SDK */}
      <section id="docs" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>DEVELOPER SDK</SectionLabel>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className={`${display.className} mb-6 text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
              BUILT FOR
              <br />
              <span className="text-ghost">BUILDERS</span>
            </h2>
            <p className="mb-10 max-w-md text-xs leading-6 text-zinc-400">
              A zero-friction SDK to spawn, orchestrate, and observe agents in production. Ship
              your first autonomous workflow in under 10 minutes.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-7">
              {SDK_FEATURES.map((feature) => (
                <div key={feature.no}>
                  <p className="mb-1 flex items-center justify-between text-[11px] text-zinc-200">
                    <span className="font-bold">{feature.title}</span>
                    <span className="text-[9px] text-zinc-600">{feature.no}</span>
                  </p>
                  <p className="text-[10px] leading-4 text-zinc-500">{feature.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex gap-6 text-[10px] tracking-[0.2em]">
              <span style={{ color: BLUE }}>READ THE DOCS →</span>
              <span className="text-zinc-400">GITHUB ↗</span>
            </div>
          </div>
          <div className="border border-white/10 bg-[#060608]">
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
                  <span className={`pl-4 ${line.startsWith('#') ? 'text-zinc-600' : 'text-zinc-300'}`}>{line}</span>
                </div>
              ))}
            </pre>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[10px] tracking-[0.2em]">
              <span className="text-zinc-500">@jarvis/sdk · v4.0.0 · stable</span>
              <span className="flex items-center gap-1.5" style={{ color: BLUE }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
                STABLE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FIELD REPORTS */}
      <section className="border-b border-white/10 px-5 py-24 md:px-12">
        <div className="mb-10 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
          <SectionLabel inline>FIELD REPORTS</SectionLabel>
          <span>01 / 04</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className={`${display.className} max-w-3xl text-3xl uppercase leading-[1.15] text-white md:text-4xl`}>
              “JARVIS CUT OUR AGENTIC WORKFLOW BUILD TIME FROM MONTHS TO DAYS. THE ORCHESTRATION
              LAYER IS EXACTLY WHAT ENTERPRISE SCALE DEMANDS.”
            </p>
            <div className="mt-8 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center border border-white/20 text-xs text-white">S</span>
              <div>
                <p className="text-xs font-bold text-white">Sarah Chen</p>
                <p className="text-[10px] tracking-[0.2em] text-zinc-500">CTO&nbsp;&nbsp;·&nbsp;&nbsp;MERIDIAN_LABS</p>
              </div>
            </div>
          </div>
          <div className="border border-white/10 p-8">
            <p className="text-[10px] tracking-[0.25em] text-zinc-500">KEY_RESULT</p>
            <p className={`${display.className} mt-3 text-6xl`} style={{ color: BLUE }}>
              12X
            </p>
            <p className="mt-1 text-[10px] tracking-[0.25em] text-zinc-400">FASTER DELIVERY</p>
          </div>
        </div>
        <div className="mt-14 overflow-hidden border-t border-white/10 pt-6">
          <div className="animate-marquee flex w-max gap-14 text-[10px] tracking-[0.3em] text-zinc-600">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span key={i}>{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING */}
      <section id="pricing" className="border-b border-white/10 px-5 py-24 md:px-12">
        <SectionLabel>PRICING</SectionLabel>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className={`${display.className} text-5xl uppercase leading-[0.92] text-white md:text-7xl`}>
            SCALE AGENTS.
            <br />
            <span className="text-ghost">NOT YOUR BILL.</span>
          </h2>
          <div className="flex items-center border border-white/15 text-[10px] tracking-[0.2em]">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 ${billing === 'monthly' ? 'bg-white text-black' : 'text-zinc-400'}`}
            >
              MONTHLY
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-2 px-4 py-2 ${billing === 'annual' ? 'bg-white text-black' : 'text-zinc-400'}`}
            >
              ANNUAL
              <span className="text-[8px]" style={{ color: billing === 'annual' ? '#1d4ed8' : BLUE }}>
                SAVE_20%
              </span>
            </button>
          </div>
        </div>
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.no} className={`relative bg-black p-8 ${plan.popular ? 'outline outline-1' : ''}`}
              style={plan.popular ? { outlineColor: BLUE } : undefined}
            >
              <div className="mb-6 flex items-center justify-between text-[10px] tracking-[0.25em]">
                <span className="text-zinc-600">{plan.no}</span>
                {plan.popular && (
                  <span className="px-2 py-0.5 text-[9px] font-bold text-black" style={{ background: BLUE }}>
                    POPULAR
                  </span>
                )}
              </div>
              <h3 className={`${display.className} text-2xl uppercase text-white`}>{plan.name}</h3>
              <p className="mt-1 text-[11px] text-zinc-500">{plan.desc}</p>
              <p className={`${display.className} mt-6 text-5xl text-white`}>
                {plan.price === '$39' && billing === 'annual' ? '$31' : plan.price}
                <span className="ml-1 text-xs text-zinc-500">{plan.period}</span>
              </p>
              <ul className="mt-7 space-y-2.5 text-[11px] text-zinc-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span style={{ color: BLUE }}>+</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/studio"
                className={`mt-8 block py-3 text-center text-[10px] font-bold tracking-[0.2em] ${
                  plan.popular ? 'text-black' : 'border border-white/20 text-zinc-200 hover:border-white'
                }`}
                style={plan.popular ? { background: BLUE } : undefined}
              >
                {plan.cta}&nbsp;&nbsp;→
              </Link>
            </div>
          ))}
        </div>
        <p className="pt-6 text-center text-[10px] tracking-[0.25em] text-zinc-600">
          ALL PLANS INCLUDE E2E ENCRYPTION · SOC 2 COMPLIANCE · 99.97% UPTIME SLA
        </p>
      </section>

      {/* ── FINAL CTA */}
      <section className="border-b border-white/10 px-5 py-28 text-center md:px-12">
        <p className="mb-8 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
          JARVIS RUNTIME · READY
        </p>
        <h2 className={`${display.className} text-6xl uppercase leading-[0.92] text-white md:text-8xl`}>
          YOUR FIRST
          <br />
          <span style={{ color: BLUE }}>AGENT</span>
          <br />
          STARTS NOW.
        </h2>
        <p className="mx-auto mt-8 max-w-md text-xs leading-6 text-zinc-400">
          Join 4,200+ engineers deploying autonomous AI workflows. Free tier includes 10K agent
          actions/month. No credit card required.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/studio"
            className="px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] text-black hover:opacity-90"
            style={{ background: BLUE }}
          >
            DEPLOY FIRST AGENT&nbsp;&nbsp;→
          </Link>
          <Link
            href="/studio"
            className="border border-white/25 px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] text-zinc-200 hover:border-white"
          >
            TALK TO SALES&nbsp;&nbsp;→
          </Link>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-4">
          {[
            ['4.2K+', 'engineers'],
            ['1.2B+', 'actions / day'],
            ['99.97%', 'uptime SLA'],
            ['SOC 2', 'certified'],
          ].map(([value, label]) => (
            <div key={label} className="bg-black p-5">
              <p className={`${display.className} text-2xl text-white`}>{value}</p>
              <p className="mt-1 text-[9px] tracking-[0.25em] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 푸터 */}
      <footer className="px-5 py-16 md:px-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center border" style={{ borderColor: BLUE }}>
                <span className="h-2.5 w-2.5" style={{ background: BLUE }} />
              </span>
              <span className="text-base font-black tracking-[0.2em] text-white">JARVIS</span>
            </div>
            <p className="max-w-xs text-[11px] leading-5 text-zinc-500">
              The platform to build, orchestrate, and scale autonomous AI agents in production.
            </p>
            <div className="mt-6 flex gap-5 text-[10px] tracking-[0.2em] text-zinc-400">
              <span className="hover:text-white">TWITTER ↗</span>
              <span className="hover:text-white">GITHUB ↗</span>
              <span className="hover:text-white">DISCORD ↗</span>
            </div>
          </div>
          {(
            [
              ['PLATFORM', ['Agents', 'Orchestration', 'Infrastructure', 'Integrations', 'Security']],
              ['DEVELOPERS', ['Documentation', 'API Reference', 'SDK', 'Status', 'Changelog']],
              ['COMPANY', ['About', 'Blog', 'Careers', 'Contact', 'Legal']],
            ] as const
          ).map(([title, items]) => (
            <div key={title}>
              <p className="mb-4 text-[10px] tracking-[0.3em] text-zinc-600">{title}</p>
              <ul className="space-y-2.5 text-[11px] text-zinc-400">
                {items.map((item) => (
                  <li key={item} className="cursor-pointer hover:text-white">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[9px] tracking-[0.25em] text-zinc-600">
          <span>© 2025 JARVIS INTELLIGENCE, INC.</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
            ALL_SYSTEMS_NOMINAL
          </span>
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ children, inline }: { children: string; inline?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500 ${inline ? '' : 'mb-5'}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
      {children}
    </p>
  );
}

function IntegrationChip({ tag, name }: { tag: string; name: string }) {
  return (
    <span className="flex shrink-0 items-center gap-3 border border-white/10 bg-white/[0.02] px-5 py-3">
      <span className="text-[8px] tracking-[0.2em] text-zinc-600">{tag}</span>
      <span className="text-xs text-zinc-200">{name}</span>
    </span>
  );
}

/** 시큐리티 카드 상단 도트 패턴 (레퍼런스의 점 장식) */
function DotPattern({ seed }: { seed: number }) {
  return (
    <div className="flex h-4 items-end gap-1.5">
      {Array.from({ length: 12 }, (_, i) => {
        const on = (i * 7 + seed * 5) % 3 !== 0;
        return (
          <span
            key={i}
            className="inline-block h-1 w-1 rounded-full"
            style={{
              background: on ? (i % 4 === seed % 4 ? BLUE : 'rgba(255,255,255,0.35)') : 'rgba(255,255,255,0.08)',
              marginBottom: `${(i * 5 + seed * 3) % 8}px`,
            }}
          />
        );
      })}
    </div>
  );
}
