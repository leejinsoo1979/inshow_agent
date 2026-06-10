import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">ARCHI Agent Studio</h1>
      <p className="text-center text-zinc-600">
        건축·인테리어 전문가가 AI 직원과 대화하며 글, 이미지, 법규 지식, 시공 디테일, 업무
        산출물을 생성·수정·축적하는 전문 AI 워크스페이스
      </p>
      <Link
        href="/studio"
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-white hover:bg-zinc-700"
      >
        스튜디오 열기
      </Link>
    </main>
  );
}
