import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ARCHI Agent Studio',
  description: '건축·인테리어 전문 AI 워크스페이스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
