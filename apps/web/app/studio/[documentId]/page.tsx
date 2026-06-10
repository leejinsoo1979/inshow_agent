'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { BlockEditor } from '@/components/editor/BlockEditor';

export default function DocumentStudioPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [reloadKey] = useState(0);

  return (
    <div className="flex h-screen">
      {/* 좌측 AI 패널 (Prompt 3에서 구현) */}
      <aside className="flex w-96 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <Link href="/studio" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← 스튜디오
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-400">
          AI 채팅 패널은 다음 단계에서 추가됩니다.
          {selectedBlockId && (
            <span className="mt-2 block text-xs text-blue-500">
              선택된 블록: {selectedBlockId}
            </span>
          )}
        </div>
      </aside>

      {/* 우측 문서 캔버스 */}
      <main className="flex-1 bg-zinc-50">
        <BlockEditor
          documentId={documentId}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          reloadKey={reloadKey}
        />
      </main>
    </div>
  );
}
