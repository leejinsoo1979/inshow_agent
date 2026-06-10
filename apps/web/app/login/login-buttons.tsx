'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import type { IconType } from 'react-icons';

type ProviderId = 'google' | 'kakao' | 'naver';

// 카카오/네이버 버튼 컬러는 각 플랫폼 브랜드 가이드 준수 (테마 컬러 아님)
const META: Record<ProviderId, { label: string; className: string; icon: IconType }> = {
  google: {
    label: 'Google로 계속하기',
    className: 'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900',
    icon: FcGoogle,
  },
  kakao: {
    label: '카카오로 계속하기',
    className: 'bg-[#FEE500] text-[#191600] hover:brightness-95',
    icon: RiKakaoTalkFill,
  },
  naver: {
    label: '네이버로 계속하기',
    className: 'bg-[#03C75A] text-white hover:brightness-95',
    icon: SiNaver,
  },
};

export function LoginButtons({ providers }: { providers: ProviderId[] }) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      {providers.map((id) => {
        const { label, className, icon: Icon } = META[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => signIn(id, { callbackUrl: '/studio' })}
            className={`relative flex h-12 w-full items-center justify-center text-[13px] font-semibold transition ${className}`}
          >
            <Icon size={id === 'naver' ? 14 : 19} aria-hidden className="absolute left-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
