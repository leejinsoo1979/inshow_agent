import { handlers } from '@/auth';

// Auth.js가 /api/auth/* (signin, callback, signout 등)를 처리한다.
// 형제 라우트 dev-login, me 는 정적 세그먼트라 catch-all보다 우선한다.
export const { GET, POST } = handlers;
