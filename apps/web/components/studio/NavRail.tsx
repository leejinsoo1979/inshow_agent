'use client';

import Link from 'next/link';

const NAV_ITEMS: { icon: string; label: string; href: string }[] = [
  { icon: '🏠', label: '홈', href: '/studio' },
  { icon: '📄', label: '문서', href: '/studio' },
  { icon: '🤖', label: '에이전트', href: '/studio' },
  { icon: '📚', label: '지식베이스', href: '/studio/knowledge' },
  { icon: '🕸️', label: '온톨로지', href: '/studio/ontology' },
  { icon: '💬', label: '메신저', href: '/studio/messenger' },
];

/** 좌측 다크 네비게이션 레일 (참고 UI: docs/design/images/studio-screen.png) */
export function NavRail() {
  return (
    <nav className="flex w-16 flex-col items-center gap-1 bg-[#16161f] py-4 text-zinc-400">
      <Link
        href="/"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white"
        title="ARCHI Agent Studio"
      >
        A
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          title={item.label}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg hover:bg-white/10"
        >
          <span aria-hidden>{item.icon}</span>
          <span className="sr-only">{item.label}</span>
        </Link>
      ))}
      <div className="mt-auto rounded-md bg-violet-600/20 px-2 py-1 text-[10px] text-violet-300">
        Pro
      </div>
    </nav>
  );
}
