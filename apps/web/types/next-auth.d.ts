import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    /** 우리 앱(DB)의 User.id */
    userId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}
