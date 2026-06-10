import Link from 'next/link';
import { Black_Han_Sans } from 'next/font/google';
import { enabledProviderIds } from '@/auth';
import { HeroNetwork } from '@/components/landing/HeroNetwork';
import { isDevLoginAllowed } from '@/lib/auth';
import { LoginButtons } from './login-buttons';
import { DevLoginForm } from './dev-login-form';

const display = Black_Han_Sans({ weight: '400', preload: false, display: 'swap' });

export const metadata = {
  title: '로그인 · ARCHI Agent Studio',
};

// provider 활성 여부를 런타임 env로 판단하므로 정적 프리렌더하지 않는다.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const providers = enabledProviderIds();
  const devLogin = isDevLoginAllowed(process.env);

  return (
    <main className="flex min-h-screen bg-white font-mono">
      {/* ── 좌측 브랜드 패널 (랜딩과 동일한 디자인 언어) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-black p-10 text-zinc-300 lg:flex">
        <HeroNetwork dark />
        <div className="relative flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-500">
          <span>SYS:ARCHI-OS&nbsp;&nbsp;/&nbsp;&nbsp;LOGIN</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
            ALL_SYSTEMS_NOMINAL
          </span>
        </div>

        <div className="relative">
          <p className="mb-6 text-[10px] tracking-[0.3em] text-zinc-500">
            — ARCHI v1.0 · 건축·인테리어 AI 지식문서 플랫폼
          </p>
          <h1 className={`${display.className} text-6xl leading-[1.02] text-white xl:text-7xl`}>
            문서를 직접
            <br />
            <span className="text-ghost-dark">조립하는</span>
            <br />
            AI 에이전트
          </h1>
          <p className="mt-8 max-w-md text-xs leading-6 text-zinc-400">
            블록 단위 문서 조립, 역할별 멀티 에이전트, 온톨로지 지식 그래프. 승인 없이는 문서가
            바뀌지 않습니다.
          </p>
        </div>

        <div className="relative flex items-center justify-between text-[9px] tracking-[0.25em] text-zinc-600">
          <span>© 2026 ARCHI AGENT STUDIO</span>
          <span>BUILD 2026.06</span>
        </div>
      </aside>

      {/* ── 우측 로그인 패널 */}
      <section className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center border border-zinc-900">
              <span className="h-2.5 w-2.5 bg-zinc-900" />
            </span>
            <span className="text-sm font-black tracking-[0.2em] text-zinc-900">ARCHI</span>
            <span className="border-l border-zinc-300 pl-2.5 text-[9px] tracking-[0.25em] text-zinc-400">
              AGENT STUDIO
            </span>
          </Link>
          <Link href="/" className="text-[10px] tracking-[0.2em] text-zinc-400 hover:text-zinc-900">
            ← 홈으로
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
              SIGN_IN
            </p>
            <h2 className={`${display.className} text-4xl text-zinc-900`}>로그인</h2>
            <p className="mb-10 mt-3 text-xs leading-5 text-zinc-500">
              소셜 계정으로 시작하세요. 첫 로그인 시 워크스페이스가 자동으로 만들어집니다.
            </p>

            {providers.length > 0 ? (
              <LoginButtons providers={providers} />
            ) : (
              <p className="border border-zinc-200 bg-zinc-50 p-4 text-center text-xs leading-5 text-zinc-500">
                아직 소셜 로그인이 설정되지 않았습니다.
                <br />
                .env에 OAuth 키(AUTH_GOOGLE_ID 등)를 추가해 주세요.
              </p>
            )}

            {devLogin && (
              <>
                <div className="my-8 flex items-center gap-3 text-[10px] tracking-[0.2em] text-zinc-400">
                  <span className="h-px flex-1 bg-zinc-200" />
                  DEV_LOGIN
                  <span className="h-px flex-1 bg-zinc-200" />
                </div>
                <DevLoginForm />
              </>
            )}

            <p className="mt-10 text-center text-[10px] leading-4 tracking-wide text-zinc-400">
              로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
