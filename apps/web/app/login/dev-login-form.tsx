'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';

/** 개발용 이메일 로그인 (ALLOW_DEV_LOGIN 환경에서만 노출) */
export function DevLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      router.push('/studio');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dev@example.com"
          className="h-11 flex-1 border border-zinc-300 px-3 text-[13px] outline-none focus:border-zinc-900"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="h-11 bg-zinc-900 px-5 text-[12px] font-bold tracking-[0.1em] text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {busy ? '...' : '입장'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
