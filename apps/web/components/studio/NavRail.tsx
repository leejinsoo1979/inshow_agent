'use client';

import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  FiCpu,
  FiFileText,
  FiHome,
  FiMessageSquare,
  FiShare2,
  FiBookOpen,
} from 'react-icons/fi';

const NAV_ITEMS: { icon: IconType; label: string; href: string }[] = [
  { icon: FiHome, label: '홈', href: '/studio' },
  { icon: FiFileText, label: '문서', href: '/studio' },
  { icon: FiCpu, label: '에이전트', href: '/studio' },
  { icon: FiBookOpen, label: '지식베이스', href: '/studio/knowledge' },
  { icon: FiShare2, label: '온톨로지', href: '/studio/ontology' },
  { icon: FiMessageSquare, label: '메신저', href: '/studio/messenger' },
];

/** 좌측 다크 네비게이션 레일 (참고 UI: docs/design/images/studio-screen.png) */
export function NavRail() {
  return (
    <nav className="flex w-16 flex-col items-center gap-1 bg-[#16161f] py-4 text-zinc-400">
      <Link
        href="/"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-zinc-900"
        title="ARCHI Agent Studio"
      >
        A
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          title={item.label}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 hover:text-zinc-100"
        >
          <item.icon size={18} aria-hidden />
          <span className="sr-only">{item.label}</span>
        </Link>
      ))}
      <div className="mt-auto rounded-md bg-white/10 px-2 py-1 text-[10px] text-zinc-300">
        Pro
      </div>
    </nav>
  );
}
