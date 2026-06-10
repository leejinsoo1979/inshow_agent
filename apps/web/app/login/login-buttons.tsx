'use client';

import { signIn } from 'next-auth/react';

type ProviderId = 'google' | 'kakao' | 'naver';

const META: Record<ProviderId, { label: string; className: string }> = {
  google: {
    label: 'Google로 계속하기',
    className: 'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50',
  },
  kakao: {
    label: '카카오로 계속하기',
    className: 'bg-[#FEE500] text-[#191600] hover:brightness-95',
  },
  naver: {
    label: '네이버로 계속하기',
    className: 'bg-[#03C75A] text-white hover:brightness-95',
  },
};

export function LoginButtons({ providers }: { providers: ProviderId[] }) {
  return (
    <div className="flex w-full flex-col gap-3">
      {providers.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => signIn(id, { callbackUrl: '/studio' })}
          className={`flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold transition ${META[id].className}`}
        >
          {META[id].label}
        </button>
      ))}
    </div>
  );
}
