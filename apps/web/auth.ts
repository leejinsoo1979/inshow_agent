import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import { devLogin } from '@/lib/services/auth';

/**
 * 환경변수가 설정된 provider만 활성화한다.
 * (키를 아직 발급받지 않은 provider는 로그인 버튼에서도 숨긴다.)
 */
function activeProviders(): NextAuthConfig['providers'] {
  const providers: NextAuthConfig['providers'] = [];
  if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
  if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
  if (process.env.AUTH_NAVER_ID) providers.push(Naver);
  return providers;
}

/** 클라이언트(로그인 페이지)에서 어떤 버튼을 보일지 결정하기 위한 목록 */
export function enabledProviderIds(): Array<'google' | 'kakao' | 'naver'> {
  const ids: Array<'google' | 'kakao' | 'naver'> = [];
  if (process.env.AUTH_GOOGLE_ID) ids.push('google');
  if (process.env.AUTH_KAKAO_ID) ids.push('kakao');
  if (process.env.AUTH_NAVER_ID) ids.push('naver');
  return ids;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: activeProviders(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    /**
     * 최초 로그인 시 소셜 프로필의 email로 사용자를 upsert하고,
     * 조직/워크스페이스가 없으면 생성해 OWNER로 등록한다 (devLogin 재사용).
     * 우리 앱의 사용자 식별자(user.id)를 토큰에 저장한다.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const result = await devLogin({
          email: user.email,
          name: user.name ?? undefined,
        });
        token.userId = result.user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.userId = token.userId;
      return session;
    },
  },
});
