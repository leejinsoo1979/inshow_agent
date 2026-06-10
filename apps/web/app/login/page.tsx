import { enabledProviderIds } from '@/auth';
import { LoginButtons } from './login-buttons';

export const metadata = {
  title: '로그인 · ARCHI Agent Studio',
};

// provider 활성 여부를 런타임 env로 판단하므로 정적 프리렌더하지 않는다.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const providers = enabledProviderIds();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">ARCHI Agent Studio</h1>
          <p className="mt-2 text-sm text-zinc-500">소셜 계정으로 시작하세요</p>
        </div>

        {providers.length > 0 ? (
          <LoginButtons providers={providers} />
        ) : (
          <p className="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-700">
            아직 소셜 로그인이 설정되지 않았습니다.
            <br />
            환경변수에 OAuth 키를 추가해 주세요.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </main>
  );
}
